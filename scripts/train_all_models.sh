#!/bin/bash
set -e

python -m src.training.train_q_learning
python -m src.training.train_dqn
