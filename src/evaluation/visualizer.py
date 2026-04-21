"""Visualization helpers for training and evaluation outputs."""

from pathlib import Path

import matplotlib.pyplot as plt


def plot_rewards(rewards, output_path: str = "results/figures/reward_curve.png"):
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(8, 4))
    plt.plot(rewards)
    plt.title("Reward Curve")
    plt.xlabel("Episode")
    plt.ylabel("Reward")
    plt.tight_layout()
    plt.savefig(out)
    plt.close()


def plot_losses(losses, output_path: str = "results/figures/loss_curve.png"):
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(8, 4))
    plt.plot(losses)
    plt.title("Loss Curve")
    plt.xlabel("Step")
    plt.ylabel("Loss")
    plt.tight_layout()
    plt.savefig(out)
    plt.close()
