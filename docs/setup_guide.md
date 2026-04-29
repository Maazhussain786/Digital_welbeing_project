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
5. After each update, click Reload on the extension card.

## Namaz Mode Notes
1. Namaz lock targets Asar and Maghrib windows.
2. Prayer times are fetched daily from a public API for Islamabad, Pakistan.
3. If API is unavailable, fallback times from settings are used.
4. During active lock, all tabs with media are force-paused and playback is blocked until lock ends.
