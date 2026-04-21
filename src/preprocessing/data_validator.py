"""Validation utilities for processed usage data."""

from typing import Dict, List

import pandas as pd


REQUIRED_COLUMNS = [
    "user_id",
    "timestamp",
    "app",
    "category",
    "duration_minutes",
]


def validate_usage_data(df: pd.DataFrame) -> Dict[str, List[str]]:
    """Return validation errors and warnings for a dataset."""
    errors: List[str] = []
    warnings: List[str] = []

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        errors.append(f"Missing required columns: {', '.join(missing)}")
        return {"errors": errors, "warnings": warnings}

    null_ratio = df[REQUIRED_COLUMNS].isna().mean()
    high_null = null_ratio[null_ratio > 0.05]
    for col, ratio in high_null.items():
        warnings.append(f"Column '{col}' has high null ratio: {ratio:.1%}")

    if (pd.to_numeric(df["duration_minutes"], errors="coerce") < 0).any():
        errors.append("Negative values found in duration_minutes.")

    if df["user_id"].nunique() == 0:
        errors.append("No users found in dataset.")

    return {"errors": errors, "warnings": warnings}
