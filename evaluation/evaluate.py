"""Deterministic correctness and workflow reliability evaluation.

LLM quality metrics (for example RAGAS) intentionally belong in a future module.
"""
import json
import os
import statistics
import sys
import time
from pathlib import Path
from typing import Any

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.rules import evaluate_child_measurements
from backend.validators import validate_child_input

BASE_DIR = Path(__file__).resolve().parent
TEST_CASES_FILE = BASE_DIR / "test_cases.json"
RESULTS_FILE = BASE_DIR / "results.json"
API_URL = os.getenv("ANGANAI_API_URL", "http://127.0.0.1:8000").rstrip("/")
TIMEOUT_SECONDS = 120


def load_cases() -> list[dict[str, Any]]:
    return json.loads(TEST_CASES_FILE.read_text(encoding="utf-8"))


def evaluate_validation() -> dict[str, Any]:
    cases = load_cases()
    valid_total = invalid_total = valid_ok = invalid_ok = 0
    print("\n" + "=" * 50 + "\nAnganAI Validation Evaluation\n" + "=" * 50)
    for case in cases:
        expected = case["expected"]["valid"]
        try:
            validate_child_input(case["input"])
            actual = True
        except Exception:
            actual = False
        if expected:
            valid_total += 1
            valid_ok += actual == expected
        else:
            invalid_total += 1
            invalid_ok += actual == expected
        print(f"{case['id']:20} Expected={int(expected):<5} Actual={int(actual):<5} {'PASS' if actual == expected else 'FAIL'}")
    passed = valid_ok + invalid_ok
    result = {"accuracy": 100 * passed / len(cases) if cases else 0,
              "invalid_input_detection": 100 * invalid_ok / invalid_total if invalid_total else 0}
    print(f"\nOverall accuracy:         {result['accuracy']:.2f}%")
    print(f"Invalid-case accuracy:    {result['invalid_input_detection']:.2f}%")
    return result


def evaluate_rules() -> dict[str, Any]:
    cases = [case for case in load_cases() if case["expected"]["valid"]]
    latencies: list[float] = []
    successful = 0
    print("\n" + "=" * 50 + "\nAnganAI Rules Engine Evaluation\n" + "=" * 50)
    for case in cases:
        started = time.perf_counter()
        try:
            evaluate_child_measurements(case["input"])
            successful += 1
            status = "PASS"
        except Exception as error:
            status = f"FAIL Error={error}"
        elapsed = time.perf_counter() - started
        latencies.append(elapsed)
        print(f"{case['id']:20} {status} Latency={elapsed:.6f}s")
    return {"success_rate": 100 * successful / len(cases) if cases else 0,
            "average_latency_seconds": statistics.mean(latencies) if latencies else 0}


def validate_ai_response(data: Any) -> tuple[bool, list[str]]:
    """Validate all required response fields and practical primitive types."""
    if not isinstance(data, dict):
        return False, ["response must be a JSON object"]
    required = {"child_data": dict, "child_id": int, "child_code": str,
                "assessment": dict, "nutrition": dict, "report": dict}
    nested = {
        "assessment": {"growth_status": str, "risk_level": str, "summary": str,
                       "recommendation": str, "follow_up_days": int},
        "nutrition": {"breakfast": str, "lunch": str, "evening_snack": str, "dinner": str, "supplement": str},
        "report": {"summary": str, "parent_advice": str, "worker_notes": str},
    }
    problems: list[str] = []
    def check(label: str, value: Any, expected: type) -> None:
        if not isinstance(value, expected) or (expected is int and isinstance(value, bool)):
            problems.append(f"{label} must be {expected.__name__}")
    for key, expected in required.items():
        if key not in data:
            problems.append(key)
        else:
            check(key, data[key], expected)
    for parent, fields in nested.items():
        if not isinstance(data.get(parent), dict):
            continue
        for key, expected in fields.items():
            if key not in data[parent]:
                problems.append(f"{parent}.{key}")
            else:
                check(f"{parent}.{key}", data[parent][key], expected)
    return not problems, problems


def _body(response: requests.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text


def evaluate_ai_workflow() -> dict[str, Any]:
    cases = [case for case in load_cases() if case["expected"]["valid"]]
    success = structured = api_failures = workflow_failures = structured_failures = timeout_failures = unexpected_responses = 0
    latencies: list[float] = []
    records: list[dict[str, Any]] = []
    print("\n" + "=" * 50 + "\nAnganAI AI Workflow Evaluation\n" + "=" * 50)
    print(f"API: {API_URL}/analyze?evaluation=true\nTest cases: {len(cases)}")
    for case in cases:
        started = time.perf_counter()
        record: dict[str, Any] = {"id": case["id"]}
        try:
            response = requests.post(f"{API_URL}/analyze", params={"evaluation": "true"}, json=case["input"], timeout=TIMEOUT_SECONDS)
            elapsed = time.perf_counter() - started
            latencies.append(elapsed)
            body = _body(response)
            record.update(status_code=response.status_code, latency_seconds=elapsed, response=body)
            if response.status_code != 200:
                category = "workflow/LLM failure" if response.status_code == 503 else "HTTP/API failure"
                workflow_failures += response.status_code == 503
                api_failures += response.status_code != 503
                record["failure_category"] = category
                print(f"{case['id']}\nHTTP={response.status_code}\nLatency={elapsed:.2f}s\nResponse={body}")
            elif not isinstance(body, dict):
                unexpected_responses += 1
                record["failure_category"] = "unexpected response"
                print(f"{case['id']}\nHTTP=200\nLatency={elapsed:.2f}s\nResponse={body}")
            else:
                success += 1
                valid, problems = validate_ai_response(body)
                if valid:
                    structured += 1
                    record["structured_output"] = "valid"
                    print(f"{case['id']:20} HTTP=200 Latency={elapsed:.2f}s Structure=VALID")
                else:
                    structured_failures += 1
                    record.update(failure_category="invalid structured output", structured_output="invalid", problems=problems)
                    print(f"{case['id']}\nHTTP=200\nLatency={elapsed:.2f}s\nStructured output errors={problems}")
        except requests.Timeout as error:
            elapsed = time.perf_counter() - started
            latencies.append(elapsed)
            timeout_failures += 1
            record.update(latency_seconds=elapsed, failure_category="timeout", exception=str(error))
            print(f"{case['id']}\nTIMEOUT\nLatency={elapsed:.2f}s\nException={error}")
        except requests.RequestException as error:
            elapsed = time.perf_counter() - started
            latencies.append(elapsed)
            api_failures += 1
            record.update(latency_seconds=elapsed, failure_category="HTTP/API failure", exception=str(error))
            print(f"{case['id']}\nREQUEST FAILED\nLatency={elapsed:.2f}s\nException={error}")
        records.append(record)
    total = len(cases)
    return {"total_cases": total, "successful_workflows": success,
            "workflow_success_rate": 100 * success / total if total else 0,
            "structured_outputs": structured, "structured_output_success_rate": 100 * structured / total if total else 0,
            "average_latency_seconds": statistics.mean(latencies) if latencies else 0,
            "median_latency_seconds": statistics.median(latencies) if latencies else 0,
            "min_latency_seconds": min(latencies) if latencies else 0,
            "max_latency_seconds": max(latencies) if latencies else 0,
            "api_failures": api_failures, "workflow_failures": workflow_failures,
            "structured_output_failures": structured_failures, "timeout_failures": timeout_failures,
            "unexpected_responses": unexpected_responses, "cases": records}


def main() -> None:
    validation = evaluate_validation()
    rules = evaluate_rules()
    ai = evaluate_ai_workflow()
    results = {"validation": validation, "rules_engine": rules, "ai_workflow": ai}
    RESULTS_FILE.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print("\n" + "=" * 50 + "\nANGANAI EVALUATION SUMMARY\n" + "=" * 50)
    print(f"Validation accuracy:       {validation['accuracy']:.2f}%\nInvalid input detection:  {validation['invalid_input_detection']:.2f}%")
    print(f"Rules engine success:      {rules['success_rate']:.2f}%\nRules engine latency:      {rules['average_latency_seconds']:.6f}s")
    print(f"AI workflow success:       {ai['workflow_success_rate']:.2f}%\nStructured output success: {ai['structured_output_success_rate']:.2f}%")
    print(f"Average AI latency:        {ai['average_latency_seconds']:.2f}s\nMedian AI latency:         {ai['median_latency_seconds']:.2f}s")
    print(f"Min AI latency:            {ai['min_latency_seconds']:.2f}s\nMax AI latency:            {ai['max_latency_seconds']:.2f}s")
    print(f"API/workflow failures:     {ai['api_failures'] + ai['workflow_failures']}\nStructured output failures:{ai['structured_output_failures']}")
    print("=" * 50 + f"\nResults written to {RESULTS_FILE}")


if __name__ == "__main__":
    main()
