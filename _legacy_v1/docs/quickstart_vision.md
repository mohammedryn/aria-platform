# Quick Start: Testing Vision + Gemini

## 🚀 Test on Your Laptop (Webcam) RIGHT NOW

### Step 1: Install Dependencies
```bash
cd /home/rayan/aria-swarm/software/pi5_coordinator
pip3 install -r requirements.txt
```

### Step 2: Set Your Gemini API Key
```bash
# Get your key at: https://makersuite.google.com/app/apikey
export GEMINI_API_KEY="your-api-key-here"

# Make it permanent (optional)
echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.bashrc
```

### Step 3: Run the Test!
```bash
cd /home/rayan/aria-swarm/software/pi5_coordinator
python3 src/test_vision_gemini.py
```

### Step 4: Chat with Gemini!
```
You: Can you see me?
Gemini: Yes, I can see a person sitting at a desk...

You: What objects are on my desk?
Gemini: I see a laptop, coffee mug, notebook, and...

You: Describe what you see
Gemini: You're in a workspace with...
```

---

## 📋 Available Commands

In the interactive test:

- **`capture`** - Take a fresh photo
- **`analyze`** - Detailed scene analysis (structured JSON)
- **`describe`** - Natural language description
- **`objects`** - List all detected objects
- **`help`** - Show all commands
- **`exit`** - Quit

Or just ask natural questions!

---

## 🔧 Command Line Options

```bash
# Use specific camera
python3 src/test_vision_gemini.py --camera webcam

# Save captured images
python3 src/test_vision_gemini.py --save-images

# Headless mode (no display, for Pi over SSH)
python3 src/test_vision_gemini.py --no-display
```

---

## 🎯 Example Session

```
╔═══════════════════════════════════════════════════════════╗
║         A.R.I.A. Vision + Gemini Test Interface          ║
╚═══════════════════════════════════════════════════════════╝

📸 Initializing camera (auto)...
✓ Camera ready: webcam

🤖 Connecting to Gemini API...
✓ Gemini API connected

READY! You can now chat with Gemini about what it sees.

📸 Capturing initial image...
✓ Image captured!

💬 You: Can you see me?
🤖 Gemini (1.8s): Yes! I can see you sitting in front of your computer...

💬 You: What's on my desk?
🤖 Gemini (2.1s): I see several objects: a laptop, a coffee mug (blue), 
some papers, a pen, and what looks like a phone charger...

💬 You: analyze
🔍 Analyzing scene (this may take 1-2 seconds)...

📊 Analysis (latency: 1.95s):

Detected 5 objects:
  1. Laptop computer
     Position: center, near camera
     Properties: open, screen visible
  2. Blue coffee mug
     Position: right side
     Properties: ceramic, handle visible
  3. Notebook
     Position: left side
     Properties: spiral bound, open
  ...

💬 You: exit
👋 Goodbye!
```

---

## ✅ What This Proves

When this works, you've validated:
- ✅ Camera capture works
- ✅ Gemini API connection works
- ✅ Vision + AI integration works
- ✅ Natural language understanding works
- ✅ Object detection works
- ✅ Response latency is acceptable

**You're ready to move on to the next phase!**

---

## 🐛 Troubleshooting

### Camera not found
```bash
# Check if webcam is connected
ls /dev/video*

# Try different device
python3 src/test_vision_gemini.py --camera webcam
```

### Gemini API error
```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Test key manually
python3 src/gemini_coordinator.py
```

### Import errors
```bash
# Install dependencies
pip3 install google-generativeai opencv-python pillow pyyaml numpy
```

---

## 📦 Next Steps

Once your laptop webcam test works:

1. **Push to GitHub**
   ```bash
   git add -A
   git commit -m "Add vision + Gemini integration"
   git push origin main
   ```

2. **Clone on Pi 5**
   ```bash
   git clone https://github.com/your-username/aria-swarm.git
   cd aria-swarm
   ```

3. **Connect Pi HQ Camera**

4. **Run same script on Pi**
   ```bash
   python3 software/pi5_coordinator/src/test_vision_gemini.py
   # Auto-detects Pi Camera!
   ```

5. **It just works!** 🎉
