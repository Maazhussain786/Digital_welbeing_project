"""Feature engineering helpers for RL training."""

import pandas as pd


CATEGORY_ENCODING = {
    "social_media": 0,
    "entertainment": 1,
    "productivity": 2,
    "shopping": 3,
    "news": 4,
    "other": 5,
}


def add_training_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add model-ready features to cleaned usage data."""
    enriched = df.copy().sort_values(["user_id", "timestamp"])

    enriched["hour"] = enriched["timestamp"].dt.hour
    enriched["day_of_week"] = enriched["timestamp"].dt.dayofweek
    enriched["date"] = enriched["timestamp"].dt.date
    enriched["is_weekend"] = (enriched["day_of_week"] >= 5).astype(int)

    enriched["cumulative_time_today"] = enriched.groupby(["user_id", "date"])["duration_minutes"].cumsum()
    enriched["session_count_today"] = enriched.groupby(["user_id", "date"]).cumcount() + 1

    gap = enriched.groupby("user_id")["timestamp"].diff().dt.total_seconds().div(60)
    enriched["time_since_last_session"] = gap.fillna(120)

    enriched["category_encoded"] = enriched["category"].map(CATEGORY_ENCODING).fillna(CATEGORY_ENCODING["other"])

    return enriched.reset_index(drop=True)
