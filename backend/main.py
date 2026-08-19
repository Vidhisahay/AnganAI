from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

from backend.agents import WorkflowGenerationError
from backend.graph import graph
from backend.rules import evaluate_child_measurements
from backend.utils import logger
from backend.validators import validate_child_input
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AnganAI API",
    description="Multi-Agent AI Assistant for Anganwadi Workers",
    version="1.0.0",
)

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

from backend.schemas import (
    AnalyzeResponse,
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
def analyze(child: ChildInput):
    child_data = child.model_dump()
    validation_output = validate_child_input(child_data)
    logger.info("Validation passed")

    rules_output = evaluate_child_measurements(child_data)
    logger.info("Rules engine completed")

    try:
        return graph.invoke(
            {
                "child_data": child_data,
                "validation_output": validation_output,
                "rules_output": rules_output,
                "errors": [],
            }
        )
    except WorkflowGenerationError as error:
        logger.error("Workflow generation failed: %s", error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except Exception as error:
        logger.exception("Unexpected workflow failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete the child assessment. Please try again.",
        ) from error
