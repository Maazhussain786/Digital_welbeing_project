"""Reminder text variants based on intervention strength."""


def reminder_message(level: int) -> str:
    if level <= 0:
        return "Keep going with intention."
    if level == 1:
        return "Quick check-in: is this app helping your goal right now?"
    if level == 2:
        return "You are drifting off-track. Consider a short break."
    if level == 3:
        return "Strong reminder: this usage is exceeding your plan."
    return "Hard limit reached. Pause now and come back mindfully."
