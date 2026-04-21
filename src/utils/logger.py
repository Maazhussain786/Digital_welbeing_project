"""Simple project logger utility."""

import logging
from pathlib import Path


def get_logger(name: str = "digital_wellbeing", log_file: str = "results/logs/training.log"):
    Path(log_file).parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

        stream = logging.StreamHandler()
        stream.setFormatter(formatter)

        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)

        logger.addHandler(stream)
        logger.addHandler(file_handler)

    return logger
