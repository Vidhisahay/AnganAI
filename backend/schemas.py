from pydantic import BaseModel


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
    assessment: Assessment
    nutrition: Nutrition
    report: Report