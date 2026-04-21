"""Train DQN on processed state/action data."""

import numpy as np
import torch
import torch.nn.functional as F
from torch import optim

from src.models.dqn import DQN


def train_dqn(npz_path: str = "data/processed/kaggle_processed.npz", epochs: int = 10):
    data = np.load(npz_path)
    states = torch.tensor(data["states"], dtype=torch.float32)
    actions = torch.tensor(data["actions"], dtype=torch.long)
    rewards = torch.tensor(data["rewards"], dtype=torch.float32)

    model = DQN(state_dim=states.shape[1], action_dim=5)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    for _ in range(epochs):
        logits = model(states)
        chosen = logits.gather(1, actions.view(-1, 1)).squeeze(1)
        loss = F.mse_loss(chosen, rewards)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    return model, float(loss.item())


if __name__ == "__main__":
    model, final_loss = train_dqn()
    print(f"DQN training done. Final loss: {final_loss:.4f}")
