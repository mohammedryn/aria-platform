# 🌌 A.R.I.A. Platform: The World's First Hardware-Aware Operating System

> **"In the Action Era, we don't just chat—we build."**

## 📌 Document Info

| Field | Value |
|-------|-------|
| **Project** | A.R.I.A. (Autonomous Reasoning & Intelligent Assembly) |
| **Target** | Google DeepMind Gemini API Developer Competition 2025 |
| **Track** | Vibe Engineering |
| **Timeline** | 4 Days (Feb 4-7, 2026) |
| **Status** | ✅ APPROVED - Implemented as VS Code Extension |

---

## 🎯 Executive Summary

**A.R.I.A.** is a revolutionary AI-powered platform that brings the "Cursor for Code" paradigm to the **physical world**. It combines Gemini 3.0's multimodal reasoning with autonomous action loops to create an intelligent assistant for **electronics and hardware engineering**, seamlessly integrated into the developer's native environment: **VS Code**.

### The Core Innovation
A **hardware-aware development environment** that:
1.  **SENSES** your hardware context (PlatformIO configs, Board IDs).
2.  **REASONS** using a "Council of Hardware Experts" (Gemini 1.5/2.0).
3.  **ACTS** by generating code, diff-based patches, and simulation artifacts.
4.  **VERIFIES** by auto-launching visual circuit simulations (Wokwi).

This closed-loop "Sensing → Reasoning → Acting → Verifying" system transforms VS Code from a text editor into a **Hardware Operating System**.

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VS CODE EXTENSION HOST                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│  │  EDITOR UI    │◄────►│  A.R.I.A. CORE  │◄────►│  WEBVIEW PANEL  │    │
│  │ (Text/Diffs)  │      │  (TypeScript)   │      │ (HTML/CSS/JS)   │    │
│  └───────────────┘      └────────┬────────┘      └─────────────────┘    │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    CONTEXT AWARENESS LAYER                        │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐      │  │
│  │  │ HardwareCtx   │  │  ProjectScan  │  │  WokwiGenerator   │      │  │
│  │  │ (PlatformIO)  │  │  (File Tree)  │  │ (Simulation Gen)  │      │  │
│  │  └───────────────┘  └───────────────┘  └───────────────────┘      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      GEMINI API CLIENT                            │  │
│  │  ┌─────────────────────┐    ┌──────────────────────────────────┐  │  │
│  │  │  GEMINI 1.5 PRO     │    │  GEMINI 2.0 FLASH                │  │  │
│  │  │  (Deep Reasoning)   │    │  (Fast Chat / Auto-Complete)     │  │  │
│  │  └─────────────────────┘    └──────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Extension Core (`src/extension.ts`)
The central nervous system. It handles command registration (`aria.analyze`, `aria.vision`), manages the lifecycle of the Webview Panel, and coordinates interactions between the editor and the AI.

#### 2. Hardware Context (`src/context/hardwareContext.ts`)
**"The Eyes of the System"**
Instead of generic code generation, A.R.I.A. reads your `platformio.ini` to understand exactly what board you are using (e.g., Teensy 4.1, ESP32).
*   **Auto-Detection:** Extracts `board`, `framework`, and `lib_deps`.
*   **Prompt Injection:** Automatically prepends hardware constraints to every AI request (e.g., "User is on a Teensy 4.1, Pin 13 is LED").

#### 3. Wokwi Simulation Bridge (`src/simulation/wokwiGenerator.ts`)
**"The Virtual Lab"**
A unique feature that turns code into a physical simulation.
*   **Heuristic Analysis:** Scans code for pin definitions (e.g., `#define SERVO_PIN 9`).
*   **Artifact Generation:** Creates `diagram.json` (circuit wiring) and `wokwi.toml` (firmware linking).
*   **Auto-Launch:** Automatically starts the Wokwi simulator within VS Code for instant verification.

#### 4. Gemini Client (`src/ai/geminiClient.ts`)
**"The Brain"**
A pure `fetch`-based client (no heavy npm dependencies) interacting with Google's Gemini models.
*   **Structured Output:** Enforces JSON schemas for code patches and analysis.
*   **Dry Run Mode:** Gracefully degrades if API keys are missing, allowing UI testing.
*   **Retry Logic:** Handles rate limits (429) robustly.

---

## 🏛️ The Council of Hardware (AI Personas)

A.R.I.A. doesn't just "complete code"; it employs specialized personas injected into the system prompt to ensure safety and accuracy.

### 1. The Electronics Engineer
*   **Role:** Senior Embedded Systems Engineer.
*   **Focus:** Circuit logic, power constraints, signal integrity.
*   **Safety Checks:** "Is this pin capable of PWM?", "Will this servo draw too much current from the 5V rail?"

### 2. The Firmware Architect
*   **Role:** C++/PlatformIO Expert.
*   **Focus:** Efficient code, non-blocking I/O, state machines.
*   **Output:** Generates `Unified Diff` format patches for safe application.

### 3. The Simulation Specialist
*   **Role:** Wokwi Configuration Expert.
*   **Focus:** Translating physical intent into JSON simulation files.
*   **Action:** Auto-wires components in the virtual domain.

---

## 🔄 The Autonomous Verification Loop

The hackathon requests: *"Build agents that do not just write code but verify it through autonomous testing loops."*

A.R.I.A. achieves this via the **Sim-to-Real Loop**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE SIMULATION-VERIFICATION LOOP                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. CODE ───────────────────────────────────────────────────────┐    │
│     │ User writes firmware (C++)                                │    │
│     ▼                                                           │    │
│  2. VALIDATE (Static) ──────────────────────────────────────────┤    │
│     │ A.R.I.A. checks Hardware Constraints                      │    │
│     │ - "Pin 55 does not exist on this board"                   │    │
│     │ - "Servo angle 200 is out of bounds"                      │    │
│     ▼                                                           │    │
│  3. SIMULATE (Dynamic) ─────────────────────────────────────────┤    │
│     │ A.R.I.A. generates Virtual Circuit                        │    │
│     │ - Creates .wokwi/diagram.json                             │    │
│     │ - Links compiled firmware                                 │    │
│     ▼                                                           │    │
│  4. VERIFY (Visual) ────────────────────────────────────────────┤    │
│     │ User watches Wokwi Simulator                              │    │
│     │ - Does the servo move?                                    │    │
│     │ - Does the LED blink?                                     │    │
│     ▼                                                           │    │
│  5. REFINE ─────────────────────────────────────────────────────┤    │
│     │ User requests changes via Chat                            │    │
│     │ -> Go to Step 1                                           │    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💻 UX Philosophy: "Native & Passive"

### 1. No "Chatbot" Fatigue
We avoided the trap of "just another chat window." A.R.I.A. is designed to be **passive**:
*   **Slash Commands:** `/analyze`, `/validate`, `/vision` provide quick, deterministic actions.
*   **Inline Diffs:** Code changes are presented as standard VS Code diffs, respecting the user's authority to Accept/Reject.

### 2. Hardware First
Most "Coding AIs" treat C++ like JavaScript. A.R.I.A. understands:
*   **Compilation Time:** It takes time to compile firmware.
*   **Physical Safety:** Bad code can burn motors.
*   **Context:** A "pin" isn't just an integer; it's a physical capability.

### 3. Zero-Config Simulation
The "Magic Moment" of A.R.I.A. is clicking one button to see your code run on virtual hardware. No manual wiring, no JSON editing. Just code and click.

---

## 🚀 Future Roadmap (Hackathon & Beyond)

1.  **Vision-to-Spec:** Use the `/vision` command to take a photo of a real breadboard and auto-generate the matching Wokwi simulation.
2.  **Serial Autopilot:** Allow A.R.I.A. to read the real Serial Monitor and debug runtime crashes automatically.
3.  **Voice Mode:** Hands-free interaction for engineers holding soldering irons.
