from typing import Any, TypedDict

from backend.prompts import (
    CHILD_ANALYSIS_PROMPT,
    NUTRITION_PROMPT,
    REPORT_PROMPT,
)
from backend.schemas import (
    Assessment,
    Nutrition,
    Report,
)
from backend.utils import (
    get_llm,
    logger,
)


class GraphState(TypedDict):
    child_data: dict
    validation_output: dict
    rules_output: dict[str, Any]
    assessment: dict
    nutrition: dict
    report: dict
    errors: list


class WorkflowGenerationError(Exception):
    """Raised when a structured LLM response cannot be generated."""


def supervisor_agent(state: GraphState):
    """
    Supervisor Agent

    Responsible for orchestrating the workflow.
    No medical reasoning is performed here.
    """

    logger.info("Supervisor started")

    state.setdefault("errors", [])

    return {}


def child_analysis_agent(state: GraphState):
    """
    Child Analysis Agent

    Uses the LLM to analyze the child's measurements
    and generate a structured health assessment.
    """

    try:
        llm = get_llm(Assessment)
        prompt = f"""
{CHILD_ANALYSIS_PROMPT}

Child Information:
{state["child_data"]}

Validation Output:
{state["validation_output"]}

Rules Engine Output:
{state["rules_output"]}
"""
        assessment = llm.invoke(prompt)
    except Exception as error:
        logger.exception("Child analysis generation failed")
        raise WorkflowGenerationError("Unable to generate assessment. The Groq service may be unavailable.") from error

    logger.info("Child analysis generated")

    return {
        "assessment": assessment.model_dump()
    }


def nutrition_agent(state: GraphState):
    """
    Nutrition Agent

    Generates a personalized nutrition plan based on:
    - Child information
    - Deterministic rules
    - Child assessment
    """

    try:
        llm = get_llm(Nutrition)

        rules = state["rules_output"]
        assessment = state["assessment"]

        prompt = f"""
{NUTRITION_PROMPT}

Child Information:
{state["child_data"]}

Assessment:
Growth Status: {assessment.get("growth_status")}
Risk Level: {assessment.get("risk_level")}
Summary: {assessment.get("summary")}
Recommendation: {assessment.get("recommendation")}
Follow-up Days: {assessment.get("follow_up_days")}

Deterministic Rules:
MUAC Category: {rules.get("muac_category")}
Risk Flags: {rules.get("risk_flags")}
Measurement Warnings: {rules.get("warnings")}
"""

        nutrition = llm.invoke(prompt)

    except Exception as error:
        logger.exception("Nutrition generation failed")

        raise WorkflowGenerationError(
            "Unable to generate the nutrition plan right now. "
            "Please try again."
        ) from error

    logger.info("Nutrition generated")

    return {
        "nutrition": nutrition.model_dump()
    }

def report_agent(state: GraphState):
    """
    Report Agent

    Generates a structured visit report
    for the Anganwadi worker.
    """

    try:
        llm = get_llm(Report)
        prompt = f"""
{REPORT_PROMPT}

Child Information:
{state["child_data"]}

Assessment:
{state["assessment"]}

Nutrition Plan:
{state["nutrition"]}
"""
        report = llm.invoke(prompt)
    except Exception as error:
        logger.exception("Report generation failed")
        raise WorkflowGenerationError("Unable to generate visit report. The Groq service may be unavailable.") from error

    logger.info("Report generated")
    logger.info("Workflow completed")

    return {
        "report": report.model_dump()
    }
