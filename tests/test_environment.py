import pandas as pd

from src.models.environment import DigitalWellbeingEnv


def test_environment_done_flag():
    df = pd.DataFrame(
        {
            "hour": [10],
            "day_of_week": [1],
            "cumulative_time_today": [20.0],
            "session_count_today": [1],
            "category_encoded": [1],
            "time_since_last_session": [120.0],
            "is_weekend": [0],
            "is_time_wasting": [1],
        }
    )

    env = DigitalWellbeingEnv(df)
    env.reset()
    result = env.step(1)
    assert result.done is True
