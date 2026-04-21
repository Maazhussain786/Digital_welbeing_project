"""Evaluation metrics for intervention models."""

from typing import Dict

import numpy as np


def regression_metrics(y_true, y_pred) -> Dict[str, float]:
    true = np.asarray(y_true, dtype=float)
    pred = np.asarray(y_pred, dtype=float)

    mae = float(np.mean(np.abs(true - pred)))
    mse = float(np.mean((true - pred) ** 2))
    rmse = float(np.sqrt(mse))

    return {
        "mae": mae,
        "mse": mse,
        "rmse": rmse,
    }


def policy_accuracy(y_true_actions, y_pred_actions) -> float:
    true = np.asarray(y_true_actions)
    pred = np.asarray(y_pred_actions)
    return float((true == pred).mean())
