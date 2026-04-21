"""Generate summary reports for intervention actions."""

import pandas as pd


def intervention_distribution(df: pd.DataFrame) -> pd.Series:
    if "action" not in df.columns:
        raise ValueError("DataFrame must contain 'action' column.")
    return df["action"].value_counts(normalize=True).sort_index()
