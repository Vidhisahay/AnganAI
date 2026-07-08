from typing import TypedDict

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
    assessment: dict
    nutrition: dict
    report: dict
    errors: list


def supervisor_agent(state: GraphState):
    """
    Supervisor Agent

    Responsible for orchestrating the workflow.
    No medical reasoning is performed here.
    """

    logger.info("Supervisor: Starting workflow...")

    state.setdefault("errors", [])

    return {}


def child_analysis_agent(state: GraphState):
    """
    Child Analysis Agent

    Uses the LLM to analyze the child's measurements
    and generate a structured health assessment.
    """

    logger.info("Running Child Analysis Agent")

    llm = get_llm(Assessment)

    prompt = f"""
{CHILD_ANALYSIS_PROMPT}

Child Information:

{state["child_data"]}
"""

    assessment = llm.invoke(prompt)

    return {
        "assessment": assessment.model_dump()
    }


def nutrition_agent(state: GraphState):
    """
    Nutrition Agent

    Generates a personalized nutrition plan
    based on the child's assessment.
    """

    logger.info("Running Nutrition Agent")

    llm = get_llm(Nutrition)

    prompt = f"""
{NUTRITION_PROMPT}

Child Information:

{state["child_data"]}

Assessment:

{state["assessment"]}
"""

    nutrition = llm.invoke(prompt)

    return {
        "nutrition": nutrition.model_dump()
    }


def report_agent(state: GraphState):
    """
    Report Agent

    Generates a structured visit report
    for the Anganwadi worker.
    """

    logger.info("Running Report Agent")

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

    logger.info("Workflow completed successfully")

    return {
        "report": report.model_dump()
    }