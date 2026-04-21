"""Tabular Q-learning baseline for intervention policy learning."""

from collections import defaultdict
from typing import Iterable, Tuple

import numpy as np


class QLearningModel:
    def __init__(self, action_dim: int = 5, alpha: float = 0.1, gamma: float = 0.99, epsilon: float = 0.1):
        self.action_dim = action_dim
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q_table = defaultdict(lambda: np.zeros(self.action_dim, dtype=np.float32))

    @staticmethod
    def discretize_state(state: Iterable[float]) -> Tuple[int, ...]:
        arr = np.asarray(state, dtype=np.float32)
        bins = np.array([1, 1, 10, 5, 1, 15, 1], dtype=np.float32)
        return tuple(np.floor(arr / bins).astype(int).tolist())

    def choose_action(self, state) -> int:
        s = self.discretize_state(state)
        if np.random.random() < self.epsilon:
            return int(np.random.randint(0, self.action_dim))
        return int(np.argmax(self.q_table[s]))

    def update(self, state, action: int, reward: float, next_state, done: bool):
        s = self.discretize_state(state)
        ns = self.discretize_state(next_state)

        current_q = self.q_table[s][action]
        target = reward if done else reward + self.gamma * np.max(self.q_table[ns])
        self.q_table[s][action] = current_q + self.alpha * (target - current_q)
