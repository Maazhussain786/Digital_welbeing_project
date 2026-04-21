"""Environment simulation for digital wellbeing RL training."""

from dataclasses import dataclass
from typing import Tuple

import numpy as np
import pandas as pd


@dataclass
class StepResult:
    state: np.ndarray
    reward: float
    done: bool


class DigitalWellbeingEnv:
    """Replay-style environment over historical usage rows."""

    STATE_COLUMNS = [
        "hour",
        "day_of_week",
        "cumulative_time_today",
        "session_count_today",
        "category_encoded",
        "time_since_last_session",
        "is_weekend",
    ]

    def __init__(self, data: pd.DataFrame):
        if data.empty:
            raise ValueError("Environment requires non-empty data.")
        self.data = data.reset_index(drop=True)
        self.index = 0

    def reset(self) -> np.ndarray:
        self.index = 0
        return self._current_state()

    def _current_state(self) -> np.ndarray:
        row = self.data.iloc[self.index]
        return row[self.STATE_COLUMNS].to_numpy(dtype=np.float32)

    def _reward(self, row: pd.Series, action: int) -> float:
        is_time_wasting = int(row.get("is_time_wasting", 0))
        if is_time_wasting and action == 0:
            return -5.0
        if is_time_wasting and action > 0:
            return 8.0 + min(action, 4)
        if not is_time_wasting and action == 0:
            return 3.0
        return -2.0

    def step(self, action: int) -> StepResult:
        row = self.data.iloc[self.index]
        reward = self._reward(row, action)

        self.index += 1
        done = self.index >= len(self.data)

        if done:
            state = np.zeros(len(self.STATE_COLUMNS), dtype=np.float32)
        else:
            state = self._current_state()

        return StepResult(state=state, reward=reward, done=done)
