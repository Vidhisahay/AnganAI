"""Deterministic request validation for child measurements."""

import logging
from typing import Any

from fastapi import HTTPException, status


# Configure logger
logger = logging.getLogger(__name__)


def validate_child_input(child_data: dict[str, Any]) -> dict[str, str]:
    """
    Validate child measurement values before the AI workflow is invoked.

    Raises:
        HTTPException: If one or more measurements are invalid.

    Returns:
        dict: Validation success status.
    """

    errors: list[str] = []

    # Validate age
    _validate_range(
        errors,
        "Age",
        child_data.get("age"),
        0,
        5,
        "years",
    )

    # Validate height
    _validate_range(
        errors,
        "Height",
        child_data.get("height"),
        30,
        130,
        "cm",
    )

    # Validate weight
    _validate_range(
        errors,
        "Weight",
        child_data.get("weight"),
        1,
        40,
        "kg",
    )

    # MUAC is optional
    muac = child_data.get("muac")

    if muac is not None:
        _validate_range(
            errors,
            "MUAC",
            muac,
            5,
            30,
            "cm",
        )

    # If validation errors exist, log them and return a structured error
    if errors:
        logger.warning(
            "Child input validation failed: %s",
            errors,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid child measurements.",
                "errors": errors,
            },
        )

    logger.info("Child input validation passed.")

    return {
        "validation_status": "passed"
    }


def _validate_range(
    errors: list[str],
    label: str,
    value: Any,
    minimum: float,
    maximum: float,
    unit: str,
) -> None:
    """
    Validate that a value is numeric and falls within the allowed range.
    """

    # Reject missing, non-numeric, and boolean values
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        errors.append(
            f"{label}: expected a numeric value."
        )
        return

    # Reject values outside the allowed range
    if not minimum <= value <= maximum:
        errors.append(
            f"{label}: value must be between "
            f"{minimum:g} and {maximum:g} {unit}."
        )