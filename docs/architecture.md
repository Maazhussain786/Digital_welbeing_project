# Architecture

## Components
- Data pipeline: ingestion, cleaning, feature engineering.
- RL core: environment, Q-learning baseline, DQN model.
- Extension runtime: content script tracking, background policy, popup/dashboard UI.

## Data Flow
1. Raw CSV sources are loaded and normalized.
2. Preprocessing builds training features.
3. Training produces policy artifacts.
4. Extension applies adaptive interventions based on browsing behavior.
