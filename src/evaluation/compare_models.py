"""Compare model outputs on simple aggregate metrics."""

from typing import Dict


def compare_scores(scores: Dict[str, float]) -> str:
    if not scores:
        raise ValueError("Scores dictionary cannot be empty.")
    return max(scores, key=scores.get)


if __name__ == "__main__":
    winner = compare_scores({"q_learning": 0.71, "dqn": 0.79})
    print(f"Best model: {winner}")
