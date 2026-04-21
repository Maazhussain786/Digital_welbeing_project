#!/bin/bash
set -e

echo "Setting up Digital Wellbeing Project..."

mkdir -p data/{raw/{kaggle,personal,beta_users},processed,exports}
mkdir -p src/{Data_generation,preprocessing,models,training,evaluation,intervention,utils}
mkdir -p notebooks
mkdir -p models/{checkpoints,final,experiments}
mkdir -p results/{logs/tensorboard/runs,figures,reports}
mkdir -p tests
mkdir -p chrome_extension/{background,content,popup,dashboard}
mkdir -p docs
mkdir -p scripts
mkdir -p config

touch src/__init__.py
touch tests/__init__.py

echo "Project structure created."
