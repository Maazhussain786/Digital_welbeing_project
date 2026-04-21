"""Configuration settings for the Digital Wellbeing project."""

# Data generation settings
DATA_CONFIG = {
    "num_users": 100,
    "days": 30,
    "save_path": "data/processed/synthetic_data.csv",
}

# Model hyperparameters
MODEL_CONFIG = {
    "state_dim": 7,
    "action_dim": 5,
    "hidden_dim": 128,
    "learning_rate": 0.001,
    "gamma": 0.99,
    "epsilon_start": 1.0,
    "epsilon_end": 0.01,
    "epsilon_decay": 0.995,
}

# Training settings
TRAINING_CONFIG = {
    "batch_size": 64,
    "num_episodes": 1000,
    "max_steps": 100,
    "checkpoint_interval": 50,
    "save_path": "models/checkpoints/",
}

# Intervention settings
INTERVENTION_CONFIG = {
    "delay_times": [0, 5, 10, 15],
    "reminder_types": ["gentle", "strong", "block"],
    "adaptation_rate": 0.1,
}
