"""Explainable, deterministic health checks used alongside LLM assessment."""

from typing import Any


def classify_muac(muac: float | None) -> str:
    """Classify MUAC using simple screening thresholds in centimetres."""
    if muac is None:
        return "Not provided"
    if muac < 11.5:
        return "Severe"
    if muac <= 12.5:
        return "Moderate"
    return "Normal"


def detect_unrealistic_measurements(child_data: dict[str, Any]) -> list[str]:
    """Flag internally consistent but clinically unusual measurement combinations."""
    age = child_data["age"]
    weight = child_data["weight"]
    height = child_data["height"]
    warnings: list[str] = []

    if age <= 2 and weight > 25:
        warnings.append("Weight is unusually high for a child aged 2 years or younger; verify measurement.")
    elif age <= 5 and weight > 35:
        warnings.append("Weight is unusually high for a child aged 5 years or younger; verify measurement.")

    if age == 0 and height > 90:
        warnings.append("Height is unusually high for an infant; verify measurement.")

    return warnings


def calculate_basic_risk(muac_category: str, warnings: list[str]) -> str:
    """Provide a transparent baseline risk level for the LLM to explain."""
    if muac_category == "Severe":
        return "High"
    if muac_category == "Moderate":
        return "Moderate"
    if warnings:
        return "Needs measurement review"
    return "Low"


def build_risk_flags(muac_category: str, warnings: list[str]) -> list[str]:
    flags: list[str] = []
    if muac_category == "Severe":
        flags.append("MUAC below 11.5 cm (severe screening threshold)")
    elif muac_category == "Moderate":
        flags.append("MUAC between 11.5 cm and 12.5 cm (moderate screening threshold)")
    flags.extend(warnings)
    return flags


def evaluate_child_measurements(child_data: dict[str, Any]) -> dict[str, Any]:
    """Return rule results that can be audited and provided to the LLM."""
    muac_category = classify_muac(child_data.get("muac"))
    warnings = detect_unrealistic_measurements(child_data)

    return {
        "validation_status": "passed",
        "muac_category": muac_category,
        "basic_risk": calculate_basic_risk(muac_category, warnings),
        "risk_flags": build_risk_flags(muac_category, warnings),
        "warnings": warnings,
    }
