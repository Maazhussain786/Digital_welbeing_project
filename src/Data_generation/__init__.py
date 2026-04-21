"""Data generation package aligned to target structure."""

from .synthetic_generator import generate_synthetic_dataset
from .kaggle_loader import load_and_process_kaggle

__all__ = [
    "generate_synthetic_dataset",
    "load_and_process_kaggle",
]
