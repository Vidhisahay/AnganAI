from fastapi import FastAPI
from pydantic import BaseModel

from backend.graph import graph

app = FastAPI(
    title="AnganAI API",
    description="Multi-Agent AI Assistant for Anganwadi Workers",
    version="1.0.0",
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
    result = graph.invoke({
    "child_data": child.model_dump()
    })

    return result