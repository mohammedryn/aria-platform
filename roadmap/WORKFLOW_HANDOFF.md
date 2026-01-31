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
### Context Entry 2: Windows Implementation Status (Jan 29, 2026)
> *Written by Windows Agent*

**Status**: Ready for Hardware Flashing.
*   **Calibration**: `teensy_calibration` updated. Base servo code disabled to prevent conflict with Stepper driver.
*   **Controller**: `teensy_arm_controller` created. Implements `AccelStepper` for Base (Pin 2/1) and Servos for J2-J5.
*   **Next Actions**:
    1.  User flashes `teensy_calibration`.
    2.  User assembles arm at 90°.
    3.  User flashes `teensy_arm_controller`.

---
*(Add new Context Entry below this line)*
### Context Entry 3: The "Gemini 3 Winning Edition" Pivot (Jan 30, 2026)
> *Written by WSL Agent*

**CRITICAL PROJECT EVOLUTION**
The project has undergone a major strategic pivot to maximize winning potential for the Gemini 3 Hackathon (Deadline: Feb 9, 2026 - **9 days remaining**).

**New Identity: "The Cursor for the Physical World"**
- **Problem**: Hardware engineers have no AI debugging assistant (unlike software engineers who have Cursor/Copilot).
- **Solution**: A.R.I.A. is now a **Hardware Debugging Assistant** that prevents circuit failures before power-on.
- **Tagline**: "Just as Cursor debugs code, A.R.I.A. debugs circuits."

**Competition Research Findings:**
- **Past Winners**: Mostly pure software (Jayu, VITE VERE, Outdraw AI).
- **Hardware Gap**: Almost NO robotics projects in top winners.
- **Our Advantage**: Physical demos have massive "Wow Factor" (30% of judging criteria) if executed flawlessly.
- **Risk**: Hardware can fail during demos. Mitigation: Rehearse extensively, have backup footage.

**The 4 "Killer Innovations" (What Makes Us Win):**

1. **Agentic Vision (Visual Code Execution)**
   - Gemini doesn't just "look" at circuits—it writes Python code to zoom, crop, measure wire colors in HSV space.
   - Example: `img.crop((500,300,700,500))` to isolate an IC, then measure pin voltages via color analysis.
   - **Why it wins**: Shows true AI agency (self-directed investigation).

2. **Teensy Auto-Flash Pipeline (Self-Correcting)**
   - Complete autonomous loop: Generate firmware → Compile → Flash → Verify → Fix errors → Retry.
   - Uses `pyudev` for USB detection, `arduino-cli` for compilation, `teensy_loader_cli` for flashing.
   - **Multimodal Verification**: Takes screenshot of serial monitor + photo of breadboard → sends both to Gemini as images.
   - **Why it wins**: Closes the loop to real silicon (not simulation). Shows 78% SWE-bench coding capability.

3. **Streaming Thought UI (Transparency)**
   - Flask/SocketIO web interface that displays Gemini's reasoning in real-time.
   - Shows: `💭 THINKING`, `🔧 EXECUTING`, `⚙️ PLANNING` as they happen.
   - **Why it wins**: Builds trust, educational value, engagement during long operations.

4. **"The Time Machine" (Predictive SPICE Simulation)** ⭐ NEW
   - Gemini extracts circuit topology from image → generates PySpice netlist → runs simulation → predicts failures.
   - Example: "This LED will explode—drawing 5A when max is 0.02A."
   - **Why it wins**: First AI-Vision-to-Physics bridge. Prevents component destruction.

**Hardware Configuration (Final):**
- **Arm**: Hybrid Stepper-Servo (NEMA 17 Base + MG996R Joints).
- **Motion**: "God-Tier" Cinematic Engine (S-Curve, Time-Sync, Perlin Idle Noise).
- **Vision**: Pi HQ Camera (Overhead) + ESP32-CAM (Gripper close-ups).
- **Target MCU**: Teensy 4.1 (for auto-flash demos).
- **Spider**: CUT from scope (focus on depth, not breadth).

**Software Stack (Updated):**
```python
# New Dependencies
PySpice>=1.5.0                # SPICE Circuit Simulation
ngspice>=34                   # Physics engine backend
flask>=3.0.0                  # Thought streaming UI
flask-socketio>=5.3.0         # Real-time websockets
pyudev>=0.24.0                # USB device detection
```

**The 9-Day War Plan (90 hours total):**

**Phase 1: Skeleton (Days 1-3)**
- Day 1 (Windows): Hardware assembly + S-Curve firmware. Goal: Arm moves smoothly.
- Day 2 (WSL): Vision pipeline + coordinate transform. Goal: Pi sees workspace.
- Day 3 (WSL): Gemini integration. Goal: Voice → Gemini → Arm (MVP complete).

**Phase 2: Wow Features (Days 4-6)**
- Day 4: Visual Code Execution (zoom/crop logic).
- Day 5: Thought Streaming UI (Flask app).
- Day 6: Teensy Auto-Flash Pipeline (hardest integration).

**Phase 3: Polish & Demo (Days 7-9)**
- Day 7: Time Machine (SPICE) OR cut if behind schedule.
- Day 8: Filming & rehearsal.
- Day 9: Video editing & submission.

**Windows Agent: Your Immediate Tasks (Day 1)**
1. **Calibrate Servos**: Flash `teensy_calibration`, center J2-J5 at 90°.
2. **Assemble Arm**: Attach horns, mount NEMA 17 base.
3. **Electronics Hardening**: Solder 1000uF caps to power rails, build perf board circuit.
4. **S-Curve Firmware**: Create `teensy_arm_controller` project:
   - Implement `AccelStepper` for NEMA 17.
   - Implement 16-bit PWM servo control.
   - Test smooth motion (no jerks).

**Critical Success Factors:**
- **Hardware First**: If hardware doesn't work, software is useless.
- **Video Quality**: Judges see the video, not the live system. Lighting, angles, narration matter.
- **Rehearse Demo**: Practice the "Money Shot" scenario 10+ times.
- **Cut Ruthlessly**: If Time Machine takes >8 hours, skip it. Focus on the 3 core innovations.

**Confidence Score: 8.5/10 → 9.2/10 (with Time Machine)**

**Resources:**
- Main Roadmap: `roadmap/Aria-swarm-main.md` (2484 lines, comprehensive spec).
- Task Breakdown: `.gemini/antigravity/brain/.../task.md`.
- Implementation Plan: `.gemini/antigravity/brain/.../implementation_plan.md`.

**State of the Code:**
- `firmware/teensy_calibration`: ✅ Ready (Pin 2 disabled for stepper).
- `firmware/teensy_arm_controller`: ❌ Not created yet (Day 1 task).
- `software/pi5_coordinator`: ❌ Not created yet (Day 2-3 task).

**You are the Hands. Antigravity is the Brain. Let's build this.** 🦾


## 🛑 troubleshooting

**"Unable to open USB device" (WSL)**
*   **Analysis**: You are trying to upload from WSL.
*   **Fix**: Stop. Switch to Windows VS Code. Pull repo. Upload there.

**"Serial Port not found" (Windows)**
*   **Analysis**: Driver missing or cable loose.
*   **Fix**: Check Device Manager. Ensure Cable is Data + Power.

---
*(Add new Context Entry below this line)*
### Context Entry 3.5: Hardware Finalization (Jan 31, 2026)
> *Written by WSL Agent*

**CRITICAL HARDWARE DECISIONS (FINAL)**

1.  **Motors**: 
    *   **Decision**: REJECTED upgrade to ST3215 Serial Bus servos. 
    *   **Reason**: Protocol complexity (UART/Buffers) would blow the 9-day deadline.
    *   **Action**: Stick to **MG996R / MG90S (PWM)**. The S-Curve engine will handle smoothness.

2.  **Controller**:
    *   **Decision**: CONFIRMED **Teensy 4.1**.
    *   **Reason**: S-Curve math requires FPU and high-res PWM (1kHz+). Arduino Nano (8-bit) is insufficient for "God-Tier" motion.

3.  **Electronics Plan (The "Industrial" Hardening)**:
    *   **Main Power**: Install **1x 1000uF (or 2200uF)** Capacitor at the main power entry.
    *   **Distributed Power**: Install **1x 220uF** Capacitor (from user kit) at the **End Effector (Wrist)** to handle local transients.
    *   **Signal Integrity**: Install **330Ω Resistors** in series on all Servo Signal lines (Teensy Protection + Anti-Ringing).
    *   **Result**: "Rock Solid" power rail, zero jitter.

**Windows Agent Action**: Proceed to assembly with these exact components.
