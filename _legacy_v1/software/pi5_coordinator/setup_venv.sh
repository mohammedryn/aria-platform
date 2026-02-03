#!/bin/bash
# Quick setup script for running vision test on laptop
# Creates virtual environment and installs dependencies

set -e

echo "🚀 Setting up A.R.I.A. Vision Test Environment"
echo ""

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "📍 Detected Python $PYTHON_VERSION"

# Check if python3-full is needed (for Python 3.12+)
if ! python3 -c "import distutils" 2>/dev/null; then
    echo ""
    echo "⚠️  Python distutils not found (needed for Python 3.12+)"
    echo "Please install it first:"
    echo "  sudo apt install python3-full python3-dev"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

echo ""
echo "📥 Installing dependencies..."
source venv/bin/activate

# Upgrade pip first
pip install --upgrade pip setuptools wheel

# Install dependencies one by one to see which fails
pip install google-generativeai || echo "⚠️  google-generativeai failed"
pip install opencv-python || echo "⚠️  opencv-python failed"  
pip install numpy || echo "⚠️  numpy failed"
pip install pillow || echo "⚠️  pillow failed"
pip install pyyaml || echo "⚠️  pyyaml failed"

echo ""
echo "✓ Dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the vision test:"
echo "  source venv/bin/activate"
echo "  python3 src/test_vision_gemini.py"
echo ""
echo "Or use this one-liner:"
echo "  ./run_vision_test.sh"
