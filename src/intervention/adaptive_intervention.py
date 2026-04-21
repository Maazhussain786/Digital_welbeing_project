"""Adaptive intervention policy helper."""

from typing import Dict


def select_intervention(context: Dict[str, float]) -> Dict[str, int]:
    """Select intervention level from context signals."""
    cumulative_minutes = float(context.get("cumulative_time_today", 0))
    is_time_wasting = int(context.get("is_time_wasting", 0))

    if is_time_wasting == 0:
        return {"action": 0, "level": 0}
    if cumulative_minutes < 30:
        return {"action": 1, "level": 1}
    if cumulative_minutes < 60:
        return {"action": 2, "level": 2}
    if cumulative_minutes < 90:
        return {"action": 3, "level": 3}
    return {"action": 4, "level": 4}
