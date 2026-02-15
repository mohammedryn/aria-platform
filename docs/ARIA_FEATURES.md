# 🌌 ARIA Platform Features

This document provides a comprehensive list of features for the ARIA (Autonomous Reasoning & Intelligent Assembly) platform.

## 🧠 **1. Intelligence & Reasoning Core**

ARIA is powered by Google's **Gemini 3.0** models, specifically optimized for hardware engineering.

*   **Dual-Brain Architecture**:
    *   **Pro Reasoning (Gemini 3.0 Pro)**: Handles complex tasks like architectural design, debugging race conditions, and explaining difficult concepts.
    *   **Fast Response (Gemini 3.0 Flash)**: Powered for instant code generation, syntax fixes, and chat.
*   **Hardware Context Awareness**:
    *   Reads `platformio.ini` to understand your specific board (e.g., Arduino Nano, ESP32, STM32).
    *   Knows your libraries, baud rates, and pin definitions.
    *   **Constraint Checking**: Prevents you from using pins that don't exist on your specific microcontroller.
*   **Project-Wide Analysis**:
    *   Analyzes multiple files simultaneously to find cross-file dependencies and errors.
    *   Understand CMakeLists.txt and library structures.

## 👁️ **2. Visual Perception (The "Cortex")**

ARIA turns any camera into an intelligent sensor for your code.

*   **Real-Time Hardware Recognition**:
    *   Identifies boards (Arduino, ESP32, Raspberry Pi) and components (Sensors, Motors, LEDs) via webcam.
    *   **Verification Loop**: Checks if your physical wiring matches your code (e.g., *"You defined the LED on Pin 13, but I see it connected to Pin 12"*).
*   **Multimodal Chat**:
    *   **Chat with Images**: Upload schematics or breadboard photos for debugging.
    *   **Video Analysis**: Record a video of your project behaving incorrectly, and ARIA will analyze the visual symptoms alongside the code.
*   **Live Stream Integration**:
    *   View your hardware directly within VS Code via the ARIA panel.

## ⚡ **3. Firmware & Embedded Workflow**

ARIA is deeply integrated with the embedded development lifecycle.

*   **One-Click Build & Flash**:
    *   Compiles and uploads firmware using PlatformIO directly from the chat.
    *   Automatically handles build environments.
*   **Intelligent Serial Monitor**:
    *   **Crash Dump Decoding**: Automatically analyzes stack traces, HardFaults, and register dumps (CFSR, HFSR) to pinpoint bugs.
    *   **Live Logging**: steams serial output into the chat for context-aware debugging.
*   **Safety Guards**:
    *   Prevents accidental flashing of destructive code.
    *   Validates board compatibility before upload.

## 🛠️ **4. Simulation & Digital Twin**

When hardware isn't available, ARIA builds a virtual lab.

*   **Wokwi Integration**:
    *   **Auto-Generation**: Creates `diagram.json` and `wokwi.toml` automatically based on your code and pin definitions.
    *   **Browser Simulation**: Launches a full circuit simulation directly in your browser.
    *   **Component Mapping**: Intelligently wires up simulated components (LEDs, Servos, OLEDs) to match your firmware logic.

## 🎨 **5. Generative UI & Education**

ARIA helps you visualize and understand complex systems.

*   **Concept Animation**:
    *   Generates self-contained **HTML5/SVG animations** to explain engineering concepts (e.g., *"Show me how PWM controls a servo"*).
    *   Visualizes data structures and algorithms.
*   **UI Generation**:
    *   Can generate or modify its own interface or create web dashboards for your IoT devices.
*   **Context-Aware Schematic Generation**:
    *   **Command**: `/schematic [description]` (e.g., `/schematic this project`).
    *   **Functionality**: Automatically scans the entire `src/` directory (cpp, h, ino) and `platformio.ini` when the user references "this project".
    *   **Result**: Generates a schematic diagram that accurately reflects pin assignments across multiple files and the specific board model.
    *   **Format**: Returns an SVG or Image directly in the chat panel.

## 💻 **6. VS Code Copilot Experience**

A seamless, integrated developer experience.

*   **Dedicated Panel**: Persistent chat, video, and history in the side panel.
*   **Smart Diff View**:
    *   Proposes code changes with **Unified Diffs**.
    *   Allows you to preview, apply, or reject changes surgically.
*   **Slash Commands**:
    *   `/analyze`: Review current file/selection.
    *   `/refactor`: Improve code structure.
    *   `/test`: Generate unit tests.
    *   `/fix`: Auto-fix selected errors.
    *   `/explain`: Explain code logic.
