from typing import Any, TypedDict

from langgraph.graph import StateGraph, START, END

from backend.agents import (
    supervisor_agent,
    child_analysis_agent,
    nutrition_agent,
    report_agent,
)


class GraphState(TypedDict):
    child_data: dict
    validation_output: dict
    rules_output: dict[str, Any]
    assessment: dict
    nutrition: dict
    report: dict
    errors: list


builder = StateGraph(GraphState)

builder.add_node("supervisor", supervisor_agent)
builder.add_node("child_analysis", child_analysis_agent)
builder.add_node("nutrition", nutrition_agent)
builder.add_node("report", report_agent)

builder.add_edge(START, "supervisor")
builder.add_edge("supervisor", "child_analysis")
builder.add_edge("child_analysis", "nutrition")
builder.add_edge("nutrition", "report")
builder.add_edge("report", END)

graph = builder.compile()
