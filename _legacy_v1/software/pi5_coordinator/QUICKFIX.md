# Quick Fix for Python 3.12 Environment Issue

## Problem
Python 3.12 doesn't include `distutils` by default, which is needed to build some packages.

## Solution (Choose One)

### Option 1: Install System Dependencies (Recommended)
```bash
# Install python3-full (includes distutils)
sudo apt install python3-full python3-dev

# Then run setup
cd /home/rayan/aria-swarm/software/pi5_coordinator
./setup_venv.sh
```

### Option 2: Install to User Directory (No sudo needed)
```bash
# Install packages to ~/.local
pip3 install --user google-generativeai opencv-python pillow pyyaml numpy

# Set API key
export GEMINI_API_KEY="add gemini api"

# Run test
cd /home/rayan/aria-swarm/software/pi5_coordinator
python3 src/test_vision_gemini.py
```

## After Fix
Once dependencies are installed, you can test the vision system:

```bash
cd /home/rayan/aria-swarm/software/pi5_coordinator
python3 src/test_vision_gemini.py
```

Then chat with Gemini:
- "Can you see me?"
- "What's on my desk?"
- Type `exit` to quit
