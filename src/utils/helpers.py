"""General helper functions used across modules."""

from pathlib import Path
from typing import Iterable


def ensure_dirs(paths: Iterable[str]):
    for p in paths:
        Path(p).mkdir(parents=True, exist_ok=True)


def minutes_to_seconds(minutes: float) -> int:
    return int(round(minutes * 60))


def seconds_to_minutes(seconds: int) -> float:
    return round(seconds / 60.0, 2)
