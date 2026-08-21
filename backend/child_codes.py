"""Utilities for stable, human-readable child identifiers."""

from uuid import uuid4


CHILD_CODE_PREFIX = "ANG"
PENDING_CHILD_CODE_PREFIX = "PENDING"


def child_code_for_id(child_id: int) -> str:
    """Return the deterministic public code for a database child ID."""
    return f"{CHILD_CODE_PREFIX}-{child_id:06d}"


def pending_child_code() -> str:
    """Return a temporary unique value needed before the database assigns an ID."""
    return f"{PENDING_CHILD_CODE_PREFIX}-{uuid4()}"


def normalize_child_code(child_code: str) -> str:
    """Normalize user-entered child codes before lookup."""
    return child_code.strip().upper()
