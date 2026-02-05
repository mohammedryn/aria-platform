# 🌌 A.R.I.A. Platform
**Autonomous Reasoning & Intelligent Assembly**

[![Gemini 3.0](https://img.shields.io/badge/AI-Gemini%203.0%20Pro-4285F4)](https://ai.google.dev)
[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Web-success)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

> **"The Cursor for the Physical World"**

A.R.I.A. is a **Hardware-Aware Operating System** that turns any camera into an intelligent engineering assistant. It uses a "Council of Hardware Experts" to see, reason, act, and verify physical tasks.

---

## 🚀 Features

- **👁️ Universal Vision**: Connects to USB Webcams, Pi Cameras, or Phone Cameras (WebRTC).
- **🧠 Electronics & Hardware Focus**: AI assistant specialized in electronics design, circuits, firmware, and hardware bring-up.
- **⚡ Autonomous Action**: Writes code and flashes firmware to Arduino/Teensy/ESP32 automatically.
- **🔄 Self-Healing Loop**: Verifies if the code worked by watching the physical device (e.g., "Did the LED blink?").
- **📱 Universal Client**: Access via Desktop App (Power User) or Mobile Web (Field Agent).

---

## 📂 Repository Structure

```
aria-platform/
├── aria_desktop.py          # 🖥️ Desktop App (chat + thought stream + vision)
├── aria_desktop_ide.py      # 🖥️ IDE-style UI (code workspace + command bar + suggestions sidebar)
├── src/                     # 🧠 Core Python Logic
│   ├── core/                # Orchestrators (Vision, Hardware, Gemini)
│   ├── agents/              # Electronics & Hardware (optional future agents)
│   └── tools/               # MCP Tooling (Datasheets, PlatformIO)
├── web/                     # 📱 Mobile PWA (Vite + React)
├── prompts/                 # 💬 System Instructions for Google AI Studio
├── docs/                    # 📚 Architecture & Spec
└── _legacy_v1/              # 🏛️ Archived Prototype Code
```

## 🛠️ Getting Started

### Prerequisites
- Python 3.10+
- PlatformIO CLI (`pip install platformio`)
- Google Gemini API Key

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/aria-platform
cd aria-platform

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the Desktop Agent (chat + thought stream + vision)
python aria_desktop.py

# Or run the IDE-style UI (code workspace, command bar, contextual suggestions)
python aria_desktop_ide.py
```

---

## 🏆 Hackathon Track: Vibe Engineering
A.R.I.A. implements the **Autonomous Verification Loop**:
1. **Sense**: Camera sees breadboard.
2. **Reason**: Gemini 3.0 plans a fix.
3. **Act**: PlatformIO flashes code.
4. **Verify**: Vision system confirms success.

---

*Built for the Google DeepMind Gemini API Developer Competition 2025*
