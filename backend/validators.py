"""Deterministic request validation for child measurements."""

from typing import Any

from fastapi import HTTPException, status


def validate_child_input(child_data: dict[str, Any]) -> dict[str, str]:
    """Validate values that must be safe before the AI workflow is invoked."""
    errors: list[str] = []

    _validate_range(errors, "Age", child_data.get("age"), 0, 5, "years")
    _validate_range(errors, "Height", child_data.get("height"), 30, 130, "cm")
    _validate_range(errors, "Weight", child_data.get("weight"), 1, 40, "kg")

    muac = child_data.get("muac")
    if muac is not None:
        _validate_range(errors, "MUAC", muac, 5, 30, "cm")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid child measurements.", "errors": errors},
        )

    return {"validation_status": "passed"}


def _validate_range(
    errors: list[str], label: str, value: Any, minimum: float, maximum: float, unit: str
) -> None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        errors.append(f"{label} must be a number.")
        return

    if not minimum <= value <= maximum:
        errors.append(f"{label} must be between {minimum:g} and {maximum:g} {unit}.")
