# Digital Wellbeing Project

RL-assisted digital wellbeing system with a Chrome extension pipeline for adaptive interventions.

## Current Status
- Phase 1 complete: foundational scaffold and configuration.
- Existing data generation scripts are present under `src/Data_generation/` and will be migrated/aligned in upcoming phases.

## Quick Start
1. Create a Python environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run current data processing entrypoint:
   ```bash
   python src/kaggle_loader_data.py
   ```

## Extension Troubleshooting
- If popup controls or Namaz mode seem outdated after a code change, reload the extension in `chrome://extensions`.
- If YouTube audio is still playing during Namaz lock, make sure the tab has loaded with the extension content script (refresh the tab once after extension reload).

## 10-Phase Delivery Plan
1. Foundation scaffold
2. Data generation modules
3. Preprocessing pipeline
4. RL environment and agent
5. Model training scripts
6. Evaluation and visualization
7. Intervention strategy layer
8. Chrome extension MVP
9. Tests, docs, and configs
10. Hardening and release prep

## Target Structure
The implementation follows `structure.txt` as the source of truth for final layout and components.
