# 🔄 A.R.I.A. Hybrid Development Workflow

**The "Two-Brain" Strategy**

Because WSL2 has limitations with USB Hardware passthrough (specifically for Bootloaders), we use a Hybrid Workflow.

---

## 🌍 The Architecture

| Environment | OS | Purpose | Key Tools |
| :--- | :--- | :--- | :--- |
| **The "Brain"** | **WSL (Linux)** | AI, Vision, Logic, ROS2 | Python, Gemini API, ROS2 Humble |
| **The "Hands"** | **Windows (Native)** | Firmware, Hardware Flashing | PlatformIO, Arduino, Serial Monitor |

---

## ⚡ The Workflow Loop

### 1. Developing Firmware (Teensy / ESP32)
*   **Action**: Edit C++ code in `firmware/`.
*   **Where**: **Windows** VS Code.
*   **Why**: Direct USB access for stable flashing.
*   **Process**:
    1.  `git pull` (Get latest changes).
    2.  Open `firmware/teensy_arm_controller`.
    3.  Build & Upload via PlatformIO.
    4.  Verify hardware movement.
    5.  `git push` changes back.

### 2. Developing Intelligence (Python / Logic)
*   **Action**: Edit Python code in `software/`.
*   **Where**: **WSL** VS Code.
*   **Why**: Linux environment is better for Python/ROS2 dependencies.
*   **Process**:
    1.  `git pull` (Get firmware definitions if changed).
    2.  Write Python logic in `software/pi5_coordinator`.
    3.  Run scripts (`test_vision_gemini.py`).
    4.  `git push` changes.

---

## 📝 Context Handoff (How to sync the AI Agents)

When switching computers/OS, copy the section below into the Chat to "Update" the AI.

### **Current State (Updated: Jan 28, 2026)**
> *"I am working on Project A.R.I.A. using the Hybrid Workflow."*

**Hardware Config**:
*   **Base**: NEMA 17 Stepper (Step/Dir Driver on Pins TBD).
*   **Arm**: Servos on Pins 3,4,5,6 (Teensy 4.1).
*   **Power**: Dual Rail (12V Motor / 5V Logic).

**Latest Accomplishments**:
1.  Migrated Repo to GitHub.
2.  Created `teensy_calibration` firmware.
3.  Commented out Pin 2 (Base) in calibration to protect Stepper Driver.
4.  **NEXT**: Assemble hardware and write `teensy_arm_controller` (Hybrid Stepper implementation).

---

## 🛑 troubleshooting

**"Unable to open USB device" (WSL)**
*   **Analysis**: You are trying to upload from WSL.
*   **Fix**: Stop. Switch to Windows VS Code. Pull repo. Upload there.

**"Serial Port not found" (Windows)**
*   **Analysis**: Driver missing or cable loose.
*   **Fix**: Check Device Manager. Ensure Cable is Data + Power.
