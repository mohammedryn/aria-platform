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

## 📝 Context Handoff Log (Chronological)

**RULE**: Do NOT delete old contexts. Add a new "Context Entry" at the bottom before switching machines. This creates a development history trail.

### Context Entry 1: Initial Migration to Windows (Jan 28, 2026)
> *Written by WSL Agent*

**Goal**: Flash Hardware & Assemble.
*   **Hardware Config**:
    *   Base: NEMA 17 Stepper (Skip calibration logic).
    *   Arm: Servos on Pins 3-6 (Need 90° cal).
    *   Power: Dual Rail 12V/5V.
*   **Repo Status**:
    *   Everything committed in `firmware/teensy_calibration`.
    *   Pin 2 commented out in calibration sketch.
*   **Next Action (Windows)**:
    1.  Pull Repo.
    2.  Flash `teensy_calibration`.
    3.  Assemble Arm.
    4.  Create new `teensy_arm_controller` project for Hybrid control.

### Context Entry 1.5: The "God-Tier" Firmware Strategy (Jan 28, 2026)
> *Written by WSL Agent*

**CRITICAL: Windows Agent Instructions**
Do NOT skip steps. Follow this exact hardware implementation order:

1.  **Mechanical Assembly First**:
    - Flash `teensy_calibration` (Pins 3-6 only). 
    - Power Servos (J2-J5) to snap them to 90°.
    - Assemble Arm Horns & Links.
    - Assemble NEMA 17 Base (J1).

2.  **Electronics Hardening**:
    - **CAPACITORS**: Solder 1000uF caps across power rails (Prevents brownouts).
    - **PERF BOARD**: No breadboards for 5A servo loads.

3.  **Firmware Phase A: "Industrial" S-Curve**:
    - Create new project `teensy_arm_controller`.
    - Implement `AccelStepper` for Base.
    - Implement 16-bit PWM for Servos.
    - **Goal**: Smooth movement, no jerks.

4.  **Firmware Phase B: "Cinematic" Motion Engine**:
    - Implement Time-Sync (All joints arrive together).
    - Implement "Alive" Idle Noise (Perlin).
    - **Goal**: Robot feels biological.

**Resources**: See `roadmap/Aria-swarm-main.md` Section 7 (Module 5) for the math.

---
*(Add new Context Entry below this line)*
### Context Entry 2: Windows Implementation Status (Pending)
> *To be written by Windows Agent...*


---

## 🛑 troubleshooting

**"Unable to open USB device" (WSL)**
*   **Analysis**: You are trying to upload from WSL.
*   **Fix**: Stop. Switch to Windows VS Code. Pull repo. Upload there.

**"Serial Port not found" (Windows)**
*   **Analysis**: Driver missing or cable loose.
*   **Fix**: Check Device Manager. Ensure Cable is Data + Power.
