"""Combine multiple data sources into a single normalized dataset."""

from pathlib import Path
from typing import Iterable

import pandas as pd


REQUIRED_COLUMNS = [
    "user_id",
    "timestamp",
    "app",
    "category",
    "duration_minutes",
    "launches",
    "interactions",
    "is_productive",
    "is_time_wasting",
]


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy()
    for col in REQUIRED_COLUMNS:
        if col not in frame.columns:
            frame[col] = 0
    frame["timestamp"] = pd.to_datetime(frame["timestamp"])
    return frame[REQUIRED_COLUMNS]


def combine_csv_files(input_files: Iterable[str], output_file: str = "data/processed/combined_data.csv") -> pd.DataFrame:
    """Combine CSV files that share the normalized wellbeing schema."""
    frames = []
    for path in input_files:
        csv_path = Path(path)
        if not csv_path.exists():
            continue
        frames.append(_normalize_columns(pd.read_csv(csv_path)))

    if not frames:
        raise ValueError("No valid CSV input files found to combine.")

    combined = pd.concat(frames, ignore_index=True)
    combined = combined.sort_values(["user_id", "timestamp"]).reset_index(drop=True)

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(output_path, index=False)
    return combined
