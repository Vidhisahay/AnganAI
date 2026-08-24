from typing import Any

from backend.schemas import Assessment, Nutrition, Report
from backend.utils import logger


class GuardrailViolation(Exception):
    """Raised when an AI output fails a guardrail."""


def validate_assessment_output(data: dict[str, Any]) -> dict[str, Any]:
    """
    Guardrail for Child Analysis Agent output.

    Ensures the LLM response:
    - Matches the Assessment schema
    - Uses allowed risk levels
    - Contains a valid follow-up period
    """

    try:
        assessment = Assessment.model_validate(data)
    except Exception as error:
        logger.error("Assessment output failed schema guardrail")
        raise GuardrailViolation(
            "Assessment output failed validation."
        ) from error

    allowed_risk_levels = {"Low", "Moderate", "High"}

    if assessment.risk_level not in allowed_risk_levels:
        raise GuardrailViolation(
            f"Invalid risk level returned by AI: {assessment.risk_level}"
        )

    if assessment.follow_up_days <= 0:
        raise GuardrailViolation(
            "Follow-up period must be greater than zero."
        )

    return assessment.model_dump()


def validate_nutrition_output(data: dict[str, Any]) -> dict[str, Any]:
    """
    Guardrail for Nutrition Agent output.

    Ensures all required meal sections are present
    and contain meaningful content.
    """

    try:
        nutrition = Nutrition.model_validate(data)
    except Exception as error:
        logger.error("Nutrition output failed schema guardrail")
        raise GuardrailViolation(
            "Nutrition output failed validation."
        ) from error

    required_fields = [
        "breakfast",
        "lunch",
        "evening_snack",
        "dinner",
        "supplement",
    ]

    for field in required_fields:
        value = getattr(nutrition, field, None)

        if not isinstance(value, str) or not value.strip():
            raise GuardrailViolation(
                f"Nutrition output contains an invalid {field}."
            )

    return nutrition.model_dump()


def validate_report_output(data: dict[str, Any]) -> dict[str, Any]:
    """
    Guardrail for Report Agent output.
    """

    try:
        report = Report.model_validate(data)
    except Exception as error:
        logger.error("Report output failed schema guardrail")
        raise GuardrailViolation(
            "Report output failed validation."
        ) from error

    required_fields = [
        "summary",
        "parent_advice",
        "worker_notes",
    ]

    for field in required_fields:
        value = getattr(report, field, None)

        if not isinstance(value, str) or not value.strip():
            raise GuardrailViolation(
                f"Report output contains an invalid {field}."
            )

    return report.model_dump()