# Setup Guide

## Python Setup
1. Create and activate a Python environment.
2. Install dependencies:
   pip install -r requirements.txt

## Data Pipeline
1. Run:
   python src/kaggle_loader_data.py

## Training
1. Train Q-learning:
   python -m src.training.train_q_learning
2. Train DQN:
   python -m src.training.train_dqn

## Chrome Extension
1. Open chrome://extensions
2. Enable Developer mode.
3. Click Load unpacked.
4. Select chrome_extension folder.
