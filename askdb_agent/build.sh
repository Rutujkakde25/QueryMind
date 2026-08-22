#!/usr/bin/env bash
# Builds a single-file AskDB Agent binary for the current OS.
# Run this separately on Windows, macOS, and Linux — PyInstaller
# does not cross-compile.
set -e

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

pyinstaller \
  --name "AskDB-Agent" \
  --onefile \
  --windowed \
  --clean \
  main.py

echo ""
echo "Binary is in dist/AskDB-Agent (or dist/AskDB-Agent.exe on Windows)"
