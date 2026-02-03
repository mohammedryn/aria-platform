#!/bin/bash
# Run vision test script with virtual environment
# Auto-activates venv and runs the test

cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run ./setup_venv.sh first"
    exit 1
fi

# Activate venv and run
source venv/bin/activate
python3 src/test_vision_gemini.py "$@"
