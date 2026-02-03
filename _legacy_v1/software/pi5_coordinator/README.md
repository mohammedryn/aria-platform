# Pi5 Coordinator - A.R.I.A. Brain

Central intelligence and coordination system for Project A.R.I.A.

## 🎯 What's Here

- **Vision System** - Camera interface + Gemini vision analysis
- **Gemini Integration** - Natural language understanding and reasoning
- **Agent Coordination** - Multi-agent task planning (coming soon)
- **Motion Planning** - Arm control and manipulation (coming soon)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip3 install -r requirements.txt
```

### 2. Set API Key
```bash
export GEMINI_API_KEY="your-key-here"
```

### 3. Test Vision + Gemini
```bash
python3 src/test_vision_gemini.py
```

See [Quick Start Guide](../../docs/quickstart_vision.md) for detailed instructions.

## 📁 Directory Structure

```
src/
├── utils/
│   └── camera_interface.py    # Universal camera (webcam/Pi Camera)
├── gemini_coordinator.py       # Gemini API integration
├── test_vision_gemini.py       # Interactive test script
└── agents/                     # Agent implementations (coming soon)

config/
├── camera_config.yaml          # Camera settings
└── gemini_prompts.yaml         # Prompt templates
```

## 🧪 Testing

### Test Camera Only
```python
from utils.camera_interface import CameraInterface

with CameraInterface(source="auto") as camera:
    frame = camera.capture()
    camera.save_image(frame, "test.jpg")
```

### Test Gemini Only
```python
from gemini_coordinator import GeminiCoordinator

gemini = GeminiCoordinator()
response = gemini.chat("Hello! Can you introduce yourself?")
print(response)
```

### Full Integration Test
```bash
python3 src/test_vision_gemini.py
```

## 📚 Documentation

- [Quick Start](../../docs/quickstart_vision.md) - Get started in 5 minutes
- [Setup Guide](../../docs/setup_guide.md) - Full installation
- [API Reference](../../docs/api_reference.md) - Code documentation (coming soon)
