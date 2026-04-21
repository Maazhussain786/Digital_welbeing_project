#!/bin/bash
set -e

python src/kaggle_loader_data.py
python -m src.Data_generation.synthetic_generator
