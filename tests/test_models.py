import numpy as np
import pandas as pd

from src.models.environment import DigitalWellbeingEnv
from src.models.q_learning import QLearningModel


def make_env_data():
    return pd.DataFrame(
        {
            "hour": [10, 11],
            "day_of_week": [1, 1],
            "cumulative_time_today": [20.0, 35.0],
            "session_count_today": [1, 2],
            "category_encoded": [1, 0],
            "time_since_last_session": [120.0, 30.0],
            "is_weekend": [0, 0],
            "is_time_wasting": [1, 0],
        }
    )


def test_q_learning_action_range():
    model = QLearningModel(action_dim=5)
    action = model.choose_action(np.array([10, 1, 20, 1, 1, 120, 0]))
    assert 0 <= action < 5


def test_environment_step_runs():
    env = DigitalWellbeingEnv(make_env_data())
    state = env.reset()
    step = env.step(1)
    assert len(state) == 7
    assert isinstance(step.reward, float)
