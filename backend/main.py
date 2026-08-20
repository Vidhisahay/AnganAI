from fastapi import FastAPI, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.agents import WorkflowGenerationError
from backend.graph import graph
from backend.rules import evaluate_child_measurements
from backend.utils import logger
from backend.validators import validate_child_input

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
    name: str
    age: int
    gender: str
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
    child_data = child.model_dump()

    validation_output = validate_child_input(child_data)
    logger.info("Validation passed")

    rules_output = evaluate_child_measurements(child_data)
    logger.info("Rules engine completed")

    # Find existing child
    existing_child = (
        db.query(models.Child)
        .filter(
            models.Child.name == child.name,
            models.Child.age == child.age,
            models.Child.gender == child.gender,
        )
        .first()
    )

    if existing_child:
        db_child = existing_child
    else:
        db_child = models.Child(
            name=child.name,
            age=child.age,
            gender=child.gender,
        )

        db.add(db_child)
        db.commit()
        db.refresh(db_child)

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
    "/children/{child_id}/history",
    response_model=ChildHistoryResponse
)
def get_child_history(
    child_id: int,
    db: Session = Depends(get_db),
):
    child = (
        db.query(models.Child)
        .filter(models.Child.id == child_id)
        .first()
    )

    if not child:
        raise HTTPException(
            status_code=404,
            detail="Child not found",
        )

    assessments = (
        db.query(models.Assessment)
        .filter(models.Assessment.child_id == child_id)
        .order_by(models.Assessment.created_at.asc())
        .all()
    )

    return {
        "child_id": child.id,
        "child_name": child.name,
        "assessments": assessments,
    }