"""Minimal DQN network used by training scripts."""

import torch
import torch.nn as nn


class DQN(nn.Module):
    def __init__(self, state_dim: int = 7, action_dim: int = 5, hidden_dim: int = 128):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
        )

    def forward(self, x):
        return self.network(x)
