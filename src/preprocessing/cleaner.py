"""Cleaning utilities for digital wellbeing datasets."""

import pandas as pd


def clean_usage_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and normalize usage data for downstream training."""
    cleaned = df.copy()

    cleaned = cleaned.drop_duplicates()

    if "timestamp" in cleaned.columns:
        cleaned["timestamp"] = pd.to_datetime(cleaned["timestamp"], errors="coerce")
        cleaned = cleaned.dropna(subset=["timestamp"])

    if "duration_minutes" in cleaned.columns:
        cleaned["duration_minutes"] = pd.to_numeric(cleaned["duration_minutes"], errors="coerce").fillna(0)
        cleaned["duration_minutes"] = cleaned["duration_minutes"].clip(lower=0, upper=24 * 60)

    if "launches" in cleaned.columns:
        cleaned["launches"] = pd.to_numeric(cleaned["launches"], errors="coerce").fillna(0).clip(lower=0)

    if "interactions" in cleaned.columns:
        cleaned["interactions"] = pd.to_numeric(cleaned["interactions"], errors="coerce").fillna(0).clip(lower=0)

    if "category" in cleaned.columns:
        cleaned["category"] = cleaned["category"].fillna("other").astype(str).str.strip().str.lower()

    return cleaned.reset_index(drop=True)
