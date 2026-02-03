#!/bin/bash
# Test vision with static image (WSL-friendly, no camera needed)

cd "$(dirname "$0")"

# Check if API key is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not set!"
    echo "Please run: export GEMINI_API_KEY='your-key-here'"
    exit 1
fi

# Check if test image exists
if [ ! -f "test_workspace.png" ]; then
    echo "❌ test_workspace.png not found!"
    exit 1
fi

# Activate venv and run (API key is preserved)
source venv/bin/activate
python3 src/test_vision_gemini.py --test-image test_workspace.png "$@"
