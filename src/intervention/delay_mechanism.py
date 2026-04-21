"""Delay intervention mapping."""


def delay_seconds_for_level(level: int) -> int:
    mapping = {
        0: 0,
        1: 5,
        2: 10,
        3: 15,
        4: 20,
    }
    return mapping.get(int(level), 0)
