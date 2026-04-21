import pandas as pd

from src.preprocessing.cleaner import clean_usage_data
from src.preprocessing.feature_engineering import add_training_features
from src.preprocessing.data_validator import validate_usage_data


def sample_df():
    return pd.DataFrame(
        {
            "user_id": [1, 1],
            "timestamp": ["2026-01-01 10:00:00", "2026-01-01 11:00:00"],
            "app": ["YouTube", "Gmail"],
            "category": ["entertainment", "productivity"],
            "duration_minutes": [20, 10],
            "launches": [1, 1],
            "interactions": [2, 2],
            "is_productive": [0, 1],
            "is_time_wasting": [1, 0],
        }
    )


def test_preprocessing_pipeline_outputs_features():
    cleaned = clean_usage_data(sample_df())
    validation = validate_usage_data(cleaned)
    assert not validation["errors"]

    featured = add_training_features(cleaned)
    assert "cumulative_time_today" in featured.columns
    assert "category_encoded" in featured.columns
