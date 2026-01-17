# Project A.R.I.A. - Swarm Edition

**Autonomous Retrieval & Intelligence Agent with Multi-Agent Collaboration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ROS2 Humble](https://img.shields.io/badge/ROS2-Humble-blue.svg)](https://docs.ros.org/en/humble/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)

---

## 🎯 Overview

Project A.R.I.A. is a multi-agent robotic swarm system that uses **Google's Gemini AI** as a central reasoning engine to coordinate heterogeneous robots for intelligent object manipulation and retrieval tasks.

### Key Features

- 🗣️ **Natural Language Control** - Voice commands via ESP32-S3-BOX-3
- 👁️ **Visual Reasoning** - Gemini-powered scene understanding and spatial reasoning
- 🤖 **Multi-Agent Coordination** - 5-DOF arm + mobile spider scout work together
- 🔄 **Adaptive Behavior** - Visual feedback enables error recovery and learning
- 🎯 **Zero-Shot Manipulation** - No training data required, works with any object

---

## 🛠️ System Components

### Hardware

| Component | Purpose | Platform |
|-----------|---------|----------|
| **5-DOF Robotic Arm** | Object manipulation | Teensy 4.1 (600MHz ARM Cortex-M7) |
| **Acebott Spider** | Mobile scouting, SLAM | Built-in MCU (18 servos) |
| **ESP32-S3-BOX-3** | Voice interface | ESP32-S3 (dual-core 240MHz) |
| **Raspberry Pi 5** | Central coordination | Quad-core Cortex-A76 @ 2.4GHz |
| **Pi HQ Camera** | Vision (12.3MP) | Sony IMX477 sensor |
| **SLAMTEC C1 LIDAR** | 2D mapping | 12m range, 10Hz scan rate |

### Software Stack

- **ROS2 Humble** - Robot middleware and communication
- **Google Gemini API** - Multimodal AI reasoning engine
- **OpenCV** - Computer vision preprocessing
- **SLAM Toolbox** - Autonomous navigation
- **PlatformIO** - Firmware development (Teensy + ESP32)

---

## 🚀 Quick Start

### Prerequisites

- Ubuntu 22.04 LTS (or compatible Linux)
- Python 3.10+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Hardware components listed above

### Installation (Development Machine)

```bash
# Clone the repository
git clone https://github.com/your-username/aria-swarm.git
cd aria-swarm

# Install Python dependencies
cd software/pi5_coordinator
pip3 install -r requirements.txt

# Set up Gemini API key
export GEMINI_API_KEY="your-api-key-here"
echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc
```

### Deployment to Raspberry Pi 5

```bash
# On your development machine, push code to GitHub
git add .
git commit -m "Latest changes"
git push origin main

# On Raspberry Pi 5
git clone https://github.com/your-username/aria-swarm.git
cd aria-swarm
./scripts/setup_pi.sh  # Automated setup script
```

### Flash Firmware

```bash
# Flash Teensy 4.1 (Arm Controller)
cd firmware/teensy_arm_controller
pio run -t upload

# Flash ESP32-S3-BOX-3 (Voice Interface)
cd firmware/esp32_voice_interface
pio run -t upload
```

### Run the System

```bash
# On Raspberry Pi 5
cd software/pi5_coordinator
python3 src/aria_main.py
```

---

## 📖 Documentation

- [Setup Guide](docs/setup_guide.md) - Detailed installation and configuration
- [Hardware Assembly](hardware/assembly_notes.md) - Wiring diagrams and assembly
- [Deployment Guide](docs/deployment.md) - Pi 5 deployment instructions
- [API Reference](docs/api_reference.md) - Code documentation
- [Calibration Guide](docs/calibration.md) - Camera and robot calibration

---

## 🎬 Demo Scenarios

### Scenario 1: Basic Retrieval (45 seconds)
```
USER: "ARIA, hand me the blue marker"
ARIA: [Analyzes workspace → Locates marker → Grasps → Delivers]
```

### Scenario 2: Multi-Step Reasoning (90 seconds)
```
USER: "Get me the blue marker"
ARIA: "I see the marker is blocked. Moving the notebook first"
ARIA: [Moves obstacle → Re-analyzes → Grasps marker → Delivers]
```

### Scenario 3: Multi-Agent Scout (2 minutes)
```
USER: "Bring me the battery"
ARIA: "I cannot see the battery. Deploying scout"
ARIA: [Spider explores → Locates battery → Reports coordinates → Arm retrieves]
```

---

## 🏗️ Project Structure

```
aria-swarm/
├── firmware/              # Embedded firmware
│   ├── teensy_arm_controller/   # Teensy 4.1 arm control
│   └── esp32_voice_interface/   # ESP32 voice UI
├── software/              # High-level software
│   └── pi5_coordinator/         # Python brain on Pi 5
├── hardware/              # Hardware documentation
│   ├── wiring_diagrams/
│   └── assembly_notes.md
├── docs/                  # Project documentation
├── scripts/               # Deployment automation
└── tests/                 # Integration tests
```

---

## 🧪 Testing

```bash
# Run unit tests
cd software/pi5_coordinator
python3 -m pytest tests/ -v

# Run integration tests
cd tests/integration
./run_all_tests.sh

# Manual hardware test
python3 software/pi5_coordinator/src/aria_main.py --test-mode
```

---

## 🛡️ Safety

**IMPORTANT**: This system controls physical hardware. Always:
- ✅ Test in a clear workspace with safety margins
- ✅ Keep emergency stop accessible
- ✅ Monitor first runs closely
- ✅ Verify joint limits before operation
- ✅ Use appropriate power supplies (6V for servos, 5V/5A for Pi)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** - Multimodal AI reasoning engine
- **ROS2 Community** - Robotics middleware
- **SLAMTEC** - LIDAR hardware and support
- **Espressif** - ESP32 platform and ESP-SR

---

## 📧 Contact

**Project Lead**: [Your Name]
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com

---

## 🎯 Roadmap

- [x] Phase 1: Foundation (Arm + Vision + Voice)
- [ ] Phase 2: Gemini Integration
- [ ] Phase 3: Spider Multi-Agent Coordination
- [ ] Phase 4: Advanced Features
- [ ] Phase 5: Production Deployment

---

**Built with ❤️ for the Gemini 3 Developer Competition**
