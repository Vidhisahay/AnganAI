from datetime import datetime
from pydantic import BaseModel, ConfigDict


# AI / Analysis Schemas

class Assessment(BaseModel):
    growth_status: str
    risk_level: str
    summary: str
    recommendation: str
    follow_up_days: int


class Nutrition(BaseModel):
    breakfast: str
    lunch: str
    evening_snack: str
    dinner: str
    supplement: str


class Report(BaseModel):
    summary: str
    parent_advice: str
    worker_notes: str


class AnalyzeResponse(BaseModel):
    child_data: dict
    child_id: int
    assessment: Assessment
    nutrition: Nutrition
    report: Report


# Database / Child Schemas

class ChildCreate(BaseModel):
    name: str
    age: int
    gender: str


class ChildResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssessmentHistoryItem(BaseModel):
    id: int
    age: int
    height: float
    weight: float
    muac: float | None
    growth_status: str | None
    risk_level: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChildHistoryResponse(BaseModel):
    child_id: int
    child_name: str
    assessments: list[AssessmentHistoryItem]