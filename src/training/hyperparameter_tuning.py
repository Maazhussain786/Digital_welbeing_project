"""Simple hyperparameter search for Q-learning baseline."""

from src.training.train_q_learning import train_q_learning


def tune_q_learning():
    configs = [
        {"episodes": 3},
        {"episodes": 5},
        {"episodes": 8},
    ]

    best = None
    for cfg in configs:
        _, rewards = train_q_learning(episodes=cfg["episodes"])
        score = sum(rewards) / len(rewards)
        if best is None or score > best["score"]:
            best = {"config": cfg, "score": score}

    return best


if __name__ == "__main__":
    result = tune_q_learning()
    print("Best config:", result)
