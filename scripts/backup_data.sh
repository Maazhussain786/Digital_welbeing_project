#!/bin/bash
set -e

mkdir -p data/exports
cp data/processed/*.csv data/exports/ 2>/dev/null || true
cp data/processed/*.npz data/exports/ 2>/dev/null || true
