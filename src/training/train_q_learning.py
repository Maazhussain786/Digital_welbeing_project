"""Train a tabular Q-learning baseline."""

import pandas as pd

from src.models.environment import DigitalWellbeingEnv
from src.models.q_learning import QLearningModel


def train_q_learning(data_path: str = "data/processed/kaggle_processed.csv", episodes: int = 5):
    data = pd.read_csv(data_path, parse_dates=["timestamp"])
    env = DigitalWellbeingEnv(data)
    model = QLearningModel()

    rewards = []
    for _ in range(episodes):
        state = env.reset()
        done = False
        total_reward = 0.0

        while not done:
            action = model.choose_action(state)
            step = env.step(action)
            model.update(state, action, step.reward, step.state, step.done)
            state = step.state
            done = step.done
            total_reward += step.reward

        rewards.append(total_reward)

    return model, rewards


if __name__ == "__main__":
    model, rewards = train_q_learning()
    print(f"Completed Q-learning training. Episodes: {len(rewards)}")
    print(f"Last reward: {rewards[-1]:.2f}")
