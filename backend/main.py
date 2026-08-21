from datetime import date
import re

from fastapi import FastAPI, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.agents import WorkflowGenerationError
from backend.graph import graph
from backend.rules import evaluate_child_measurements
from backend.utils import logger
from backend.validators import validate_child_input
from backend.child_codes import (
    child_code_for_id,
    normalize_child_code,
    pending_child_code,
)

from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, get_db
from . import models

from backend.schemas import AnalyzeResponse, ChildHistoryResponse

app = FastAPI(
    title="AnganAI API",
    description="Multi-Agent AI Assistant for Anganwadi Workers",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class ChildInput(BaseModel):
    child_code: str | None = None
    name: str
    age: int
    gender: str
    date_of_birth: date | None = None
    height: float
    weight: float
    muac: float | None = None


@app.get("/")
def root():
    return {
        "message": "Welcome to AnganAI API",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    child: ChildInput,
    db: Session = Depends(get_db),
):
    # The LangGraph workflow continues to receive the existing measurement payload.
    child_data = child.model_dump(exclude={"child_code", "date_of_birth"})
    child_data["name"] = child_data["name"].strip()
    child_data["gender"] = child_data["gender"].strip()

    validation_output = validate_child_input(child_data)
    logger.info("Validation passed")

    rules_output = evaluate_child_measurements(child_data)
    logger.info("Rules engine completed")

    supplied_child_code = child.child_code
    if supplied_child_code is not None:
        supplied_child_code = normalize_child_code(supplied_child_code)
        if not re.fullmatch(r"ANG-\d{6,}", supplied_child_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="child_code must use the format ANG-000001.",
            )

        existing_child = (
            db.query(models.Child)
            .filter(func.lower(models.Child.child_code) == supplied_child_code.lower())
            .first()
        )
        if not existing_child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found for the supplied child_code.",
            )
    else:
        # Backward-compatible lookup for existing frontend submissions. Age is
        # deliberately excluded because it changes between assessments.
        existing_child = (
            db.query(models.Child)
            .filter(
                func.lower(models.Child.name) == child_data["name"].lower(),
                func.lower(models.Child.gender) == child_data["gender"].lower(),
            )
            .first()
        )

    if existing_child:
        db_child = existing_child
    else:
        db_child = models.Child(
            # This placeholder permits a non-null unique column on fresh
            # databases until SQLAlchemy flushes and assigns the integer ID.
            child_code=pending_child_code(),
            name=child_data["name"],
            age=child.age,
            gender=child_data["gender"],
            date_of_birth=child.date_of_birth,
        )

        try:
            db.add(db_child)
            db.flush()
            db_child.child_code = child_code_for_id(db_child.id)
            db.commit()
            db.refresh(db_child)
        except IntegrityError as error:
            db.rollback()
            logger.exception("Unable to create child record")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to create a unique child record. Please try again.",
            ) from error

    try:
        # Run LangGraph workflow
        result = graph.invoke(
            {
                "child_data": child_data,
                "validation_output": validation_output,
                "rules_output": rules_output,
                "errors": [],
            }
        )

        # -----------------------------
        # Save assessment
        # -----------------------------

        assessment_data = result["assessment"]

        assessment = models.Assessment(
            child_id=db_child.id,
            age=child.age,
            height=child.height,
            weight=child.weight,
            muac=child.muac,
            growth_status=assessment_data["growth_status"],
            risk_level=assessment_data["risk_level"],
            summary=assessment_data["summary"],
            recommendation=assessment_data["recommendation"],
            follow_up_days=assessment_data["follow_up_days"],
        )

        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        # -----------------------------
        # Save nutrition plan
        # -----------------------------

        nutrition_data = result["nutrition"]

        nutrition_plan = models.NutritionPlan(
            assessment_id=assessment.id,
            breakfast=nutrition_data["breakfast"],
            lunch=nutrition_data["lunch"],
            evening_snack=nutrition_data["evening_snack"],
            dinner=nutrition_data["dinner"],
            supplement=nutrition_data["supplement"],
        )

        db.add(nutrition_plan)

        # -----------------------------
        # Save report
        # -----------------------------

        report_data = result["report"]

        report = models.Report(
            assessment_id=assessment.id,
            summary=report_data["summary"],
            parent_advice=report_data["parent_advice"],
            worker_notes=report_data["worker_notes"],
        )

        db.add(report)

        # Save nutrition + report
        db.commit()

        # Add database child ID to API response
        result["child_id"] = db_child.id
        result["child_code"] = db_child.child_code

        return result

    except WorkflowGenerationError as error:
        db.rollback()

        logger.error(
            "Workflow generation failed: %s",
            error,
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    except Exception as error:
        db.rollback()

        logger.exception("Unexpected workflow failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete the child assessment. Please try again.",
        ) from error


@app.get(
    "/children/{child_code}/history",
    response_model=ChildHistoryResponse
)
def get_child_history(
    child_code: str,
    db: Session = Depends(get_db),
):
    # Numeric paths remain supported for callers using the former
    # /children/{child_id}/history endpoint. New clients use child codes.
    if child_code.isdecimal():
        child = db.query(models.Child).filter(models.Child.id == int(child_code)).first()
    else:
        normalized_code = normalize_child_code(child_code)
        if not re.fullmatch(r"ANG-\d{6,}", normalized_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="child_code must use the format ANG-000001.",
            )
        child = (
            db.query(models.Child)
            .filter(func.lower(models.Child.child_code) == normalized_code.lower())
            .first()
        )

    if not child:
        raise HTTPException(
            status_code=404,
            detail="Child not found",
        )

    assessments = (
        db.query(models.Assessment)
        .filter(models.Assessment.child_id == child.id)
        .order_by(models.Assessment.created_at.asc())
        .all()
    )

    return {
        "child_id": child.id,
        "child_code": child.child_code,
        "child_name": child.name,
        "assessments": assessments,
    }
