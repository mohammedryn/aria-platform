# Project A.R.I.A. - COMPLETE SPECIFICATION
## Autonomous Retrieval & Intelligence Agent with Multi-Agent Collaboration
### **Gemini 3 Developer Competition Submission - WINNING EDITION**

**Version:** 2.0 - Complete Integration  
**Last Updated:** January 31, 2026  
**Competition Deadline:** February 9, 2026 (9 days remaining)  
**Total Participants:** 5,787  
**Prize Pool:** $100,000 | Grand Prize: $50,000 + AI Futures Fund Interview

---

## 🎯 EXECUTIVE SUMMARY

**Project A.R.I.A.** is the **"Cursor for the Physical World"** - an AI-powered hardware debugging assistant that uses Gemini 3's cutting-edge capabilities to autonomously debug, organize, and program electronics workspaces.

### **Core Value Proposition**
Just as AI code assistants like Cursor.ai debug software, A.R.I.A. debugs hardware - analyzing circuits, detecting errors, generating firmware, and physically fixing problems through robotic manipulation.

### **Key Innovation - The "Action Era" Showcase**
A.R.I.A. demonstrates Gemini 3's unprecedented capabilities:
1. **Visual Code Execution** - Gemini autonomously writes Python to investigate images
2. **Multimodal Self-Correction** - Generates code, flashes hardware, sees results, fixes mistakes
3. **Transparent Reasoning** - Streams thought process in real-time

### **Target Impact**
- Reduces hardware debugging time by 40%
- Democratizes electronics for beginners
- Prevents costly circuit errors before power-on
- Accelerates embedded systems prototyping

---

## 📋 TABLE OF CONTENTS

1. [Competition Alignment](#competition-alignment)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [System Architecture](#system-architecture)
5. [Hardware Components](#hardware-components)
6. [Software Stack](#software-stack)
7. [TOP 3 KILLER INNOVATIONS](#top-3-killer-innovations)
8. [Additional Core Features](#additional-core-features)
9. [Gemini 3 Integration Strategy](#gemini-3-integration-strategy)
10. [Implementation Details](#implementation-details)
11. [Demo Scenarios](#demo-scenarios)
12. [Development Timeline](#development-timeline)
13. [Code Examples](#code-examples)
14. [Risk Mitigation](#risk-mitigation)
15. [Submission Deliverables](#submission-deliverables)
16. [Why This Wins](#why-this-wins)

---

## 1. COMPETITION ALIGNMENT

### **Hackathon Details**
- **Name:** Gemini 3 Hackathon: Build what's next
- **Platform:** Devpost
- **Participants:** 5,787 registered
- **Deadline:** February 9, 2026
- **Judging Criteria:**
  - 40% - Technical Execution
  - 30% - Innovation/Wow Factor
  - 20% - Potential Impact
  - 10% - Presentation Quality

### **How A.R.I.A. Aligns**

**Technical Execution (40%):**
- Multi-modal integration (vision + code + hardware)
- Complex tool orchestration (80+ function calls)
- Real-world closed-loop systems
- Self-correcting autonomous agents

**Innovation/Wow Factor (30%):**
- Visual Code Execution (brand new Gemini 3 feature)
- Autonomous MCU programming with verification
- Streaming thought signatures
- Physical world manipulation with AI reasoning

**Potential Impact (20%):**
- $50B electronics industry pain point
- Educational applications
- Manufacturing automation
- Assistive technology for makers

**Presentation (10%):**
- Professional demo video
- Live hardware demonstrations
- Clear documentation
- Polished UI with thought streaming

### **Target Track: Marathon Agent**
A.R.I.A. perfectly fits the "Marathon Agent" category:
- Multi-hour workspace organization tasks
- Persistent state tracking across sessions
- Self-correction when objects move
- Long-running autonomous debugging workflows

---

## 2. PROBLEM STATEMENT

### **The Hardware Debugging Gap**

**Current Reality:**
- Software engineers use AI assistants (Cursor, GitHub Copilot) to debug code
- Hardware engineers manually debug circuits with multimeters and oscilloscopes
- No "AI debugging assistant" for the physical world

**Specific Pain Points:**

**2.1 Circuit Debugging is Manual**
- Checking connections by hand (error-prone)
- Comparing breadboards to schematics visually
- Missing short circuits until smoke appears
- No automated verification before power-on

**2.2 Firmware Development is Slow**
- Write code → Compile → Flash → Test → Repeat
- No intelligent error detection
- Manual iteration on every change
- No visual verification of hardware behavior

**2.3 Workspace Organization is Tedious**
- Loose wires everywhere
- Tools misplaced
- Components mixed up
- Manual cleanup after each project

**2.4 No Accessible Entry Point for Beginners**
- Complex tools (oscilloscopes, logic analyzers)
- Steep learning curve
- Expensive equipment
- No guided assistance

### **Real-World Scenario**
An engineer builds an Arduino circuit:
1. Wires up the breadboard (makes a mistake - wrong pin)
2. Writes firmware
3. Uploads code
4. Powers on circuit
5. **Magic smoke** - IC is destroyed
6. Spends 2 hours debugging to find the wiring error

**A.R.I.A. prevents this:**
1. Analyzes circuit BEFORE power-on
2. Detects wiring error using visual reasoning
3. Explains: "Pin 7 connected to 5V, should be GND"
4. Autonomously moves wire OR regenerates firmware to match
5. **No components destroyed**

---

## 3. SOLUTION OVERVIEW

### **3.1 Core Concept**

A.R.I.A. is a **hierarchical AI-robotic system** where:

```
HUMAN (Natural Language Intent)
    ↓
GEMINI 3 (Multi-modal Reasoning & Planning)
    ↓
ROBOTIC SYSTEM (Physical Execution)
    ↓
VISUAL FEEDBACK LOOP (Verification & Self-Correction)
```

### **3.2 System Capabilities - Tier Structure**

**Tier 1: Visual Intelligence**
- Agentic Vision with Code Execution (NEW!)
- Circuit analysis vs schematics
- Component identification
- Spatial reasoning

**Tier 2: Firmware Autonomy**
- Teensy Auto-Flash Pipeline (CORE INNOVATION)
- Code generation from natural language
- Multimodal verification with images
- Self-correcting compilation errors

**Tier 3: Transparent Reasoning**
- Streaming Thought Signatures (NEW!)
- Real-time reasoning display
- Function call argument streaming
- Educational transparency

**Tier 4: Physical Manipulation**
- 6-DOF robotic arm control
- Visual servoing for precision
- Component placement
- Wire organization

**Tier 5: Advanced Features**
- ROS-Gen: Dynamic node generation
- Workspace reset (bulldozer sweep)
- Multi-session memory
- Voice control (ESP32-S3)

### **3.3 What Makes This Different**

| Feature | Traditional Robotics | Other AI Hackathon Projects | **A.R.I.A.** |
|---------|---------------------|----------------------------|--------------|
| Vision | Template matching | Single Gemini query | **Active code-based investigation** |
| Coding | Pre-programmed | Text generation | **Self-correcting with hardware verification** |
| Reasoning | None | Hidden | **Streaming thought process visible** |
| Hardware | Simulated | None | **Real MCU auto-flash** |
| Feedback | Open-loop | Single-turn | **Closed-loop multimodal** |
| Learning | Fixed | None | **Sees mistakes, adapts** |

---

## 4. SYSTEM ARCHITECTURE

### **4.1 High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                         HUMAN OPERATOR                          │
│                    (Natural Language Commands)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              ESP32-S3-BOX-3 (Voice Interface)                   │
│  • Wake word detection                                          │
│  • Voice command processing                                     │
│  • LCD status display                                           │
│  • Audio feedback                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │ WiFi/MQTT
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           RASPBERRY PI 5 (Central Intelligence Hub)             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │          GEMINI 3 API INTEGRATION LAYER                   │ │
│  │                                                           │ │
│  │  Gemini 3 Flash (Fast Operations):                       │ │
│  │  • Visual Code Execution (Agentic Vision)                │ │
│  │  • Real-time object detection                            │ │
│  │  • Quick circuit analysis                                │ │
│  │  • Streaming function call arguments                     │ │
│  │                                                           │ │
│  │  Gemini 3 Pro (Complex Reasoning):                       │ │
│  │  • Deep circuit analysis vs schematics                   │ │
│  │  • Multi-step task planning                              │ │
│  │  • Firmware generation with self-correction              │ │
│  │  • Thought signature generation                          │ │
│  │                                                           │ │
│  │  Capabilities:                                            │ │
│  │  • Multimodal inputs (image + text + context)            │ │
│  │  • Function calling (80-150 tools orchestrated)          │ │
│  │  • Code execution for active vision                      │ │
│  │  • Thinking level control (HIGH/MEDIUM/LOW)              │ │
│  │  • Streaming responses                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         PERCEPTION & REASONING MODULE                     │ │
│  │  • Overhead Pi HQ Camera (workspace view)                │ │
│  │  • Gripper-mounted camera (close-up verification)        │ │
│  │  • Image preprocessing pipeline                          │ │
│  │  • Coordinate transformation                             │ │
│  │  • Real-time thought streaming UI                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         TEENSY AUTO-FLASH PIPELINE                        │ │
│  │  • USB device detection (pyudev)                         │ │
│  │  • Arduino CLI compilation                               │ │
│  │  • Teensy Loader CLI flashing                            │ │
│  │  • Serial monitor capture                                │ │
│  │  • Screenshot → Gemini verification                      │ │
│  │  • Self-correction loop                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         ROBOT CONTROL MODULE (ROS 2 Humble)               │ │
│  │  • Inverse kinematics (6-DOF arm)                        │ │
│  │  • Motion planning (MoveIt 2)                            │ │
│  │  • Visual servoing                                       │ │
│  │  • Gripper control                                       │ │
│  │  • Safety monitoring                                     │ │
│  │                                                           │ │
│  │  [MOTION ENGINE - TEENSY SIDE]                            │ │
│  │  • "God-Tier" Cinematic S-Curve Generator                │ │
│  │  • Time-Synchronized Trajectories (The "Orchestra")      │ │
│  │  • 16-bit PWM High-Res Interpolation                     │ │
│  │  • "Alive" Idle Noise (Perlin Injection)                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         ROS-GEN MODULE (Dynamic Node Creation)            │ │
│  │  • Template library (50+ ROS2 patterns)                  │ │
│  │  • Code generation via Gemini                            │ │
│  │  • Runtime node spawning                                 │ │
│  │  • Validation & testing                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHYSICAL COMPONENTS                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  6-DOF ROBOTIC ARM (Hybrid Stepper-Servo)                │  │
│  │  • Base: NEMA 17 stepper (smooth sweeping motion)        │  │
│  │  • Joints 2-5: High-torque servos (MG996R)              │  │
│  │  • Gripper: Adaptive parallel jaw                        │  │
│  │  • Reach: 45cm                                           │  │
│  │  • Payload: 200g                                         │  │
│  │  • Teensy 4.1 motor controller                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  VISION SYSTEM                                            │  │
│  │  • Overhead: Raspberry Pi HQ Camera (12MP)               │  │
│  │  • Gripper: ESP32-CAM (close-up verification)           │  │
│  │  • Lighting: LED ring lights (adjustable)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TEENSY 4.1 (Target MCU for Auto-Flash)                  │  │
│  │  • USB detection via Pi                                  │  │
│  │  • Auto-flash firmware pipeline                          │  │
│  │  • Serial feedback to Gemini                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### **4.2 Data Flow - Autonomous Circuit Debugging**

```
[1] User: "Check my Arduino circuit for errors"
    ↓
[2] ESP32 captures voice → transcribes → sends to Pi
    ↓
[3] Pi triggers overhead camera snapshot
    ↓
[4] Gemini 3 Flash receives:
    • Camera image
    • User command
    • Schematic reference (if provided)
    ↓
[5] Gemini uses VISUAL CODE EXECUTION:
    • Writes Python to zoom into ICs
    • Crops each component region
    • Draws bounding boxes on wires
    • Measures wire colors in HSV space
    • Counts connections per pin
    ↓
[6] Gemini generates THOUGHT SIGNATURES (streamed to UI):
    "Analyzing IC1 connections..."
    "Found 6 connections to 5V rail, expected 5"
    "Extra connection is from Pin 13 LED"
    "LED should be on 3.3V, not 5V"
    "This will burn out the LED"
    ↓
[7] Gemini calls function: capture_close_up(component='LED')
    ↓
[8] Robot arm moves gripper camera to LED
    ↓
[9] Returns MULTIMODAL IMAGE response to Gemini
    ↓
[10] Gemini confirms: "Red wire from Pin 13 to 5V rail detected"
     ↓
[11] Gemini plans multi-step fix:
     • Remove red wire from 5V
     • Place red wire on 3.3V rail
     ↓
[12] Robot arm executes (visual servoing)
     ↓
[13] Gemini verifies: Takes new photo, confirms fix
     ↓
[14] Reports to user: "Error corrected. Circuit safe to power on."
```

### **4.3 Data Flow - Teensy Auto-Flash Pipeline**

```
[1] User: "Create firmware to blink LED at 5Hz with fade effect"
    ↓
[2] Gemini 3 Pro generates Teensy code:
    • Includes proper libraries
    • Uses PWM for fading
    • Adds serial debugging
    • Self-validates syntax with code execution
    ↓
[3] Code saved to /tmp/aria_generated/firmware.ino
    ↓
[4] User plugs in Teensy 4.1
    ↓
[5] pyudev detects USB device:
    • VID:PID = 16c0:0478 (Teensy identifier)
    • Device path: /dev/ttyACM0
    ↓
[6] Voice feedback: "Teensy 4.1 detected on USB port 3"
    ↓
[7] Arduino CLI compiles code:
    • Board: teensy:avr:teensy41
    • Output: firmware.ino.hex
    ↓
[8] Compilation ERROR detected
    ↓
[9] Error message sent to Gemini as SCREENSHOT image
    ↓
[10] Gemini SEES the error in image:
     "error: 'analogWriteFrequency' was not declared"
     ↓
[11] Gemini THINKS (streamed):
     "analogWriteFrequency requires Teensy-specific library"
     "Adding #include <PWMServo.h>"
     ↓
[12] Gemini regenerates fixed code
     ↓
[13] Recompile → SUCCESS
     ↓
[14] Teensy Loader CLI flashes firmware
     ↓
[15] Serial monitor captures output (10 seconds)
     ↓
[16] Screenshot of serial output → sent to Gemini as IMAGE
     ↓
[17] Gemini SEES serial output:
     "LED initialized on pin 13"
     "PWM frequency: 5000 Hz"
     "Fade effect active"
     ↓
[18] Pi captures PHOTO of breadboard with LED
     ↓
[19] Photo sent to Gemini as MULTIMODAL function response
     ↓
[20] Gemini SEES LED fading smoothly
     ↓
[21] Gemini confirms: "Firmware deployed successfully. LED fading at 5Hz as requested."
     ↓
[22] Voice feedback: "Task complete!"
```

---

## 5. HARDWARE COMPONENTS

### **5.1 Core Hardware Bill of Materials**

| Component | Model | Quantity | Purpose | Cost |
|-----------|-------|----------|---------|------|
| **Main Computer** | Raspberry Pi 5 (8GB) | 1 | AI coordination, ROS2, Gemini API | $80 |
| **Overhead Camera** | Pi HQ Camera (12MP) | 1 | Workspace monitoring | $50 |
| **Gripper Camera** | ESP32-CAM | 1 | Close-up verification | $10 |
| **Voice Interface** | ESP32-S3-BOX-3 | 1 | Voice commands, LCD display | $50 |
| **Arm Base Motor** | NEMA 17 Stepper | 1 | Smooth base rotation | $15 |
| **Arm Joint Servos** | MG996R High-torque | 5 | Joint articulation | $50 |
| **Motor Controller** | Teensy 4.1 | 1 | Servo/stepper control | $30 |
| **Target MCU** | Teensy 4.1 | 1 | Auto-flash demonstration | $30 |
| **Gripper** | Custom parallel jaw | 1 | Object manipulation | $20 |
| **Lighting** | LED ring light | 2 | Consistent illumination | $20 |
| **Power Supply** | 12V 10A | 1 | System power | $25 |
| **Breadboard** | Standard | 2 | Demo circuits | $10 |
| **Misc** | Wires, mounts, etc. | - | Assembly | $60 |
| **TOTAL** | | | | **~$450** |

### **5.2 Hardware Architecture Decisions**

**Why NOT the spider robot:**
- ESP32-CAM video quality too poor for Gemini analysis
- Adds complexity without proportional value
- Better to focus on depth rather than breadth
- Fixed overhead camera provides superior quality

**Why Teensy 4.1:**
- Industry-standard embedded platform
- Well-documented auto-flash tools
- Represents real-world use case
- Fast enough for complex firmware

**Why Hybrid Stepper-Servo Arm:**
- NEMA 17 base: Smooth, precise rotation for sweeping motions
- Servos: High torque for lifting, fast response
- Cost-effective vs. all-stepper solutions
- Easier to control than SCARA

---

## 6. SOFTWARE STACK

### **6.1 Core Software Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  • aria_main.py (orchestrator)                              │
│  • gemini_interface.py (API abstraction)                    │
│  • thought_streaming_ui.py (real-time display)              │
│  • teensy_flasher.py (auto-flash pipeline)                  │
│  • circuit_debugger.py (visual code execution)              │
├─────────────────────────────────────────────────────────────┤
│                    MIDDLEWARE LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  • ROS 2 Humble (robot control)                             │
│  • MQTT (ESP32 ↔ Pi communication)                          │
│  • pyudev (USB device detection)                            │
│  • pyserial (serial communication)                          │
├─────────────────────────────────────────────────────────────┤
│                    TOOLS & LIBRARIES                        │
├─────────────────────────────────────────────────────────────┤
│  • google-generativeai (Gemini API)                         │
│  • OpenCV (image preprocessing)                             │
│  • Pillow (image manipulation)                              │
│  • NumPy (numerical operations)                             │
│  • arduino-cli (compilation)                                │
│  • teensy_loader_cli (flashing)                             │
│  • MoveIt2 (motion planning)                                │
├─────────────────────────────────────────────────────────────┤
│                    OPERATING SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│  Ubuntu 22.04 LTS (Raspberry Pi OS 64-bit)                  │
└─────────────────────────────────────────────────────────────┘
```

### **6.2 Key Dependencies**

**Python Packages:**
```bash
google-generativeai>=0.8.0    # Gemini API
opencv-python>=4.8.0          # Computer vision
pillow>=10.0.0                # Image processing
numpy>=1.24.0                 # Numerical computing
pyserial>=3.5                 # Serial communication
pyudev>=0.24.0                # USB detection
paho-mqtt>=1.6.0              # MQTT messaging
paho-mqtt>=1.6.0              # MQTT messaging
flask>=3.0.0                  # Thought streaming UI
PySpice>=1.5.0                # SPICE Circuit Simulation
ngspice>=34                   # Physics engine backend
```

**System Packages:**
```bash
sudo apt install -y \
    ros-humble-desktop \
    ros-humble-moveit \
    arduino-cli \
    teensy-loader-cli \
    python3-pip \
    libusb-1.0-0 \
    v4l-utils
```

**ROS 2 Packages:**
```bash
ros-humble-robot-state-publisher
ros-humble-joint-state-publisher
ros-humble-moveit-servo
ros-humble-control-msgs
```

---

## 7. TOP 3 KILLER INNOVATIONS

### **INNOVATION #1: VISUAL CODE EXECUTION (Agentic Vision)** ⭐⭐⭐⭐⭐

**What It Is:**
Gemini 3 Flash can autonomously write Python code to investigate images - zoom, crop, draw annotations, measure colors, count objects - then use those results to make decisions.

**Why It's Revolutionary:**
- Brand new feature (announced January 2025)
- Impossible with traditional computer vision
- Shows true AI agency (self-directed investigation)
- Perfect for circuit debugging

**Technical Implementation:**

```python
from google.generativeai import GenerativeModel

class AgenticVisionDebugger:
    def __init__(self):
        self.model = GenerativeModel(
            'gemini-3.5-flash-exp-0131',
            tools=['code_execution']
        )
    
    def debug_circuit(self, workspace_image, schematic_image):
        prompt = """
You are an expert electronics debugger with active vision.

TASK: Compare this breadboard circuit to the schematic and find errors.

You have code_execution enabled. Use it to:
1. Zoom into each IC and component
2. Draw bounding boxes around each wire path
3. Measure wire colors in HSV color space
4. Count connections to each power rail
5. Identify component pin numbers
6. Generate a visual diff overlay showing errors

APPROACH:
- Use PIL (Pillow) to manipulate images
- Be thorough - check every connection
- Output annotated images showing errors
- Explain each error found

SCHEMATIC REFERENCE:
- IC1 Pin 7: Should connect to GND (black wire)
- IC1 Pin 14: Should connect to 5V (red wire)
- LED: Should connect to 3.3V rail via 220Ω resistor
- Capacitor: 100nF between power rails

Begin investigation.
"""
        
        response = self.model.generate_content(
            [prompt, workspace_image, schematic_image],
            thinking_level='HIGH'  # Show reasoning process
        )
        
        return response
```

**What Gemini Does Autonomously:**

```python
# Example of code Gemini writes internally:
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# Load images
breadboard = Image.open('workspace.jpg')
schematic = Image.open('schematic.png')

# Zoom into IC1 region
ic1_region = breadboard.crop((850, 420, 1050, 620))

# Analyze Pin 7 connection
pin7_pixel = (920, 485)  # Approximate pin location
wire_sample = breadboard.crop((pin7_pixel[0]-10, pin7_pixel[1]-10,
                               pin7_pixel[0]+10, pin7_pixel[1]+10))

# Get average color
wire_color = np.array(wire_sample).mean(axis=(0,1))
r, g, b = wire_color

# Classify wire color
if r > 200 and g < 100 and b < 100:
    detected_color = "RED (5V)"
    expected_color = "BLACK (GND)"
    error = True
else:
    error = False

# Draw annotation
draw = ImageDraw.Draw(breadboard)
if error:
    draw.rectangle([pin7_pixel[0]-20, pin7_pixel[1]-20,
                    pin7_pixel[0]+20, pin7_pixel[1]+20],
                   outline="red", width=3)
    draw.text((pin7_pixel[0], pin7_pixel[1]-40),
              "ERROR: 5V instead of GND",
              fill="red")

# Save annotated image
breadboard.save('debug_output.jpg')
```

**Gemini's Reasoning Output:**

```
THOUGHT: Examining IC1 Pin 7 connection
THOUGHT: Wire color detected: RGB(220, 45, 38) - appears red
THOUGHT: Schematic specifies Pin 7 should connect to GND (black wire)
THOUGHT: ERROR FOUND: Pin 7 has 5V (red wire) when it should have GND
THOUGHT: This will cause the IC to malfunction
THOUGHT: Measuring consequences...
THOUGHT: 5V on GND pin can damage IC immediately upon power-on
THOUGHT: Severity: CRITICAL - will destroy component

RESULT: 
Error detected at IC1 Pin 7:
- Current: Connected to 5V rail (red wire)
- Expected: Connected to GND rail (black wire)
- Risk: Component destruction on power-on
- Recommendation: Move wire from 5V rail to GND rail
```

**Why This Wins:**
✅ Shows AI doing what traditional CV **cannot** do  
✅ Visual, transparent investigation process  
✅ Self-directed problem solving  
✅ Unique to Gemini 3 Flash  
✅ Practical real-world application  

**Demo Impact:**
Judge sees Gemini autonomously writing code to zoom, measure, and annotate - not just "AI detected an error" but HOW and WHY.

---

### **INNOVATION #2: TEENSY AUTO-FLASH WITH MULTIMODAL VERIFICATION** ⭐⭐⭐⭐⭐

**What It Is:**
Complete autonomous pipeline: User request → Code generation → Compilation → USB detection → Flashing → Visual verification → Self-correction.

**Why It's Revolutionary:**
- Closes the loop to real hardware (not simulation)
- Multimodal function responses (new Gemini 3 feature)
- Self-correcting based on visual feedback
- Demonstrates 78% SWE-bench coding capability

**Technical Implementation:**

```python
import subprocess
import pyudev
import serial
import time
from pathlib import Path
from PIL import Image
import io
import base64

class TeensyAutoFlashPipeline:
    def __init__(self, gemini_model):
        self.model = gemini_model
        self.usb_context = pyudev.Context()
        self.monitor = pyudev.Monitor.from_netlink(self.usb_context)
        self.monitor.filter_by(subsystem='usb')
    
    def generate_firmware(self, user_request):
        """Step 1: Generate Teensy firmware from natural language"""
        prompt = f"""
You are an expert embedded systems developer.

TASK: Generate complete Teensy 4.1 firmware for:
{user_request}

REQUIREMENTS:
- Use proper Teensy 4.1 libraries and pin definitions
- Include setup() and loop() functions
- Add Serial.begin(115200) for debugging
- Print status messages to help verify behavior
- Use best practices (const for pins, comments, etc.)
- Optimize for Teensy's 600MHz ARM Cortex-M7

OUTPUT FORMAT:
- ONLY the .ino file contents
- NO markdown code fences
- NO explanations outside code comments
- Production-ready code

Begin:
"""
        
        # Generate with code execution for self-validation
        response = self.model.generate_content(
            prompt,
            tools=['code_execution'],
            thinking_level='MEDIUM'
        )
        
        code = response.text
        
        # Save to file
        sketch_dir = Path('/tmp/aria_teensy_sketch')
        sketch_dir.mkdir(exist_ok=True)
        sketch_path = sketch_dir / 'aria_firmware.ino'
        sketch_path.write_text(code)
        
        print(f"✅ Firmware generated: {len(code)} characters")
        return sketch_path, code
    
    def wait_for_teensy(self, timeout=60):
        """Step 2: Detect when Teensy is plugged in"""
        print("\n⏳ Please plug in your Teensy 4.1...")
        print("   (Waiting up to 60 seconds)")
        
        start_time = time.time()
        for device in iter(self.monitor.poll, None):
            if time.time() - start_time > timeout:
                raise TimeoutError("Teensy not detected within 60 seconds")
            
            if device.action == 'add':
                # Teensy VID:PID = 16c0:0478 (normal) or 16c0:0483 (programming)
                vid = device.get('ID_VENDOR_ID')
                pid = device.get('ID_MODEL_ID')
                
                if vid == '16c0' and pid in ['0478', '0483']:
                    device_path = device.device_node
                    print(f"✅ Teensy 4.1 detected: {device_path}")
                    return device_path
    
    def compile_firmware(self, sketch_path, attempt=1, max_attempts=3):
        """Step 3: Compile using Arduino CLI"""
        print(f"\n🔨 Compiling firmware (attempt {attempt}/{max_attempts})...")
        
        result = subprocess.run([
            'arduino-cli', 'compile',
            '--fqbn', 'teensy:avr:teensy41',
            '--output-dir', str(sketch_path.parent),
            str(sketch_path.parent)
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Compilation successful")
            hex_file = sketch_path.parent / f"{sketch_path.stem}.ino.hex"
            return True, hex_file
        else:
            print(f"❌ Compilation failed:")
            print(result.stderr)
            
            if attempt >= max_attempts:
                raise CompilationError("Max compilation attempts exceeded")
            
            # Ask Gemini to fix the error
            fixed_code = self.fix_compilation_error(
                sketch_path.read_text(),
                result.stderr
            )
            sketch_path.write_text(fixed_code)
            
            # Retry
            return self.compile_firmware(sketch_path, attempt + 1, max_attempts)
    
    def fix_compilation_error(self, code, error_message):
        """Step 3b: Use Gemini to fix compilation errors"""
        # Take screenshot of terminal showing error
        error_screenshot = self.capture_terminal_screenshot(error_message)
        
        prompt = """
The Teensy firmware failed to compile.

ORIGINAL CODE:
```cpp
{code}
```

ERROR MESSAGE (see screenshot):
The compilation error is shown in the terminal screenshot.

TASK: Fix the code to compile successfully.

COMMON TEENSY ISSUES TO CHECK:
- Missing #include statements
- Wrong pin modes or numbers
- Teensy-specific functions vs Arduino standard
- Library compatibility

OUTPUT: Only the corrected .ino file contents.
"""
        
        response = self.model.generate_content(
            [prompt.format(code=code), error_screenshot],
            thinking_level='HIGH'  # Show reasoning
        )
        
        print("\n🔧 Gemini's fix reasoning:")
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'thought'):
                print(f"   💭 {part.thought}")
        
        fixed_code = response.text
        print("✅ Code regenerated with fixes")
        return fixed_code
    
    def flash_firmware(self, hex_file):
        """Step 4: Flash to Teensy using teensy_loader_cli"""
        print("\n⚡ Flashing firmware to Teensy...")
        
        result = subprocess.run([
            'teensy_loader_cli',
            '--mcu=TEENSY41',
            '-w',  # Wait for device
            '-v',  # Verbose
            '-s',  # Soft reboot
            str(hex_file)
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Firmware flashed successfully")
            time.sleep(2)  # Wait for reboot
            return True
        else:
            print(f"❌ Flashing failed: {result.stderr}")
            return False
    
    def verify_execution(self, expected_behavior):
        """Step 5: Verify firmware is working via multimodal feedback"""
        print("\n🔍 Verifying firmware execution...")
        
        # Capture serial output
        serial_output = self.capture_serial_output(duration=5)
        serial_screenshot = self.create_serial_screenshot(serial_output)
        
        # Capture photo of breadboard
        breadboard_photo = self.capture_breadboard_photo()
        
        # Send BOTH to Gemini as multimodal function response
        prompt = f"""
EXPECTED BEHAVIOR:
{expected_behavior}

I'm sending you two verification sources:
1. Screenshot of serial monitor output (5 seconds of data)
2. Photo of the breadboard showing LED/components

TASK: Determine if the firmware is working correctly.

ANALYSIS STEPS:
1. Read serial output - does it show expected messages?
2. Observe breadboard photo - is LED/component behaving correctly?
3. Compare actual behavior to expected behavior
4. If there's a discrepancy, identify what's wrong

RESPONSE FORMAT:
- Status: SUCCESS or FAILURE
- Observation: What you see in serial + photo
- Analysis: Does this match expectations?
- If failure: What needs to be fixed?
"""
        
        response = self.model.generate_content(
            [prompt, serial_screenshot, breadboard_photo],
            thinking_level='HIGH'
        )
        
        # Parse response
        status = "SUCCESS" if "SUCCESS" in response.text.upper() else "FAILURE"
        
        print(f"\n{'✅' if status == 'SUCCESS' else '❌'} Verification {status}")
        print(f"Gemini's analysis:\n{response.text}")
        
        if status == "FAILURE":
            # Extract what needs fixing
            return False, response.text
        
        return True, response.text
    
    def capture_serial_output(self, duration=5):
        """Capture serial output from Teensy"""
        # Find Teensy serial port
        import serial.tools.list_ports
        ports = [p.device for p in serial.tools.list_ports.comports()
                 if 'Teensy' in p.description or 'USB Serial' in p.description]
        
        if not ports:
            return "No serial output - Teensy not found"
        
        try:
            ser = serial.Serial(ports[0], 115200, timeout=1)
            time.sleep(1)  # Let it boot
            
            output_lines = []
            end_time = time.time() + duration
            
            while time.time() < end_time:
                if ser.in_waiting:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    output_lines.append(line)
                    print(f"   📡 {line}")
            
            ser.close()
            return '\n'.join(output_lines)
        
        except Exception as e:
            return f"Serial read error: {e}"
    
    def create_serial_screenshot(self, serial_text):
        """Create an image of serial output for Gemini"""
        from PIL import Image, ImageDraw, ImageFont
        
        # Create terminal-style image
        img = Image.new('RGB', (800, 600), color=(12, 12, 12))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 14)
        except:
            font = ImageFont.load_default()
        
        # Draw header
        draw.text((10, 10), "Serial Monitor - Teensy 4.1 @ 115200 baud",
                  fill=(0, 255, 0), font=font)
        draw.line([(10, 30), (790, 30)], fill=(100, 100, 100), width=1)
        
        # Draw serial output
        y = 50
        for line in serial_text.split('\n'):
            draw.text((10, y), line, fill=(200, 200, 200), font=font)
            y += 20
            if y > 580:
                break
        
        return img
    
    def capture_breadboard_photo(self):
        """Capture photo of breadboard with LED/components"""
        # Use overhead Pi HQ camera
        import subprocess
        
        # Take photo
        subprocess.run(['libcamera-still', '-o', '/tmp/breadboard.jpg',
                        '--width', '1920', '--height', '1080'])
        
        return Image.open('/tmp/breadboard.jpg')
    
    def capture_terminal_screenshot(self, text):
        """Create terminal screenshot for error messages"""
        img = Image.new('RGB', (1000, 400), color=(30, 0, 0))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 12)
        except:
            font = ImageFont.load_default()
        
        y = 10
        for line in text.split('\n')[:20]:  # First 20 lines
            draw.text((10, y), line, fill=(255, 100, 100), font=font)
            y += 18
        
        return img
    
    def run_full_pipeline(self, user_request, max_iterations=3):
        """Execute complete auto-flash pipeline with self-correction"""
        print("=" * 60)
        print("TEENSY AUTO-FLASH PIPELINE")
        print("=" * 60)
        
        iteration = 1
        
        while iteration <= max_iterations:
            print(f"\n{'='*60}")
            print(f"ITERATION {iteration}")
            print(f"{'='*60}")
            
            try:
                # Step 1: Generate firmware
                sketch_path, code = self.generate_firmware(user_request)
                
                # Step 2: Wait for Teensy
                device_path = self.wait_for_teensy()
                
                # Step 3: Compile
                success, hex_file = self.compile_firmware(sketch_path)
                
                # Step 4: Flash
                if not self.flash_firmware(hex_file):
                    raise FlashError("Flashing failed")
                
                # Step 5: Verify
                success, analysis = self.verify_execution(user_request)
                
                if success:
                    print("\n" + "="*60)
                    print("🎉 PIPELINE COMPLETE - SUCCESS!")
                    print("="*60)
                    return True, analysis
                else:
                    print(f"\n⚠️ Verification failed. Regenerating firmware...")
                    # Update user_request with failure analysis for next iteration
                    user_request = f"{user_request}\n\nPREVIOUS ATTEMPT FAILED:\n{analysis}"
                    iteration += 1
            
            except Exception as e:
                print(f"❌ Error in pipeline: {e}")
                iteration += 1
        
        print("\n❌ Max iterations reached without success")
        return False, "Pipeline failed after maximum attempts"
```

**Usage Example:**

```python
from google.generativeai import GenerativeModel

# Initialize
model = GenerativeModel('gemini-3.5-flash-exp-0131')
pipeline = TeensyAutoFlashPipeline(model)

# Run full autonomous pipeline
user_request = """
Create firmware that:
- Blinks LED on pin 13 at 5Hz
- Adds a smooth fade-in/fade-out effect using PWM
- Prints "LED: ON" and "LED: OFF" to serial monitor
- Includes a temperature sensor reading every 2 seconds
"""

success, result = pipeline.run_full_pipeline(user_request)

if success:
    print(f"✅ Firmware working perfectly!")
    print(f"Gemini's final analysis:\n{result}")
else:
    print(f"❌ Pipeline failed:\n{result}")
```

**What Makes This Innovative:**

1. **Multimodal Function Responses** (NEW!)
   - Gemini requests serial screenshot
   - You return actual IMAGE of terminal
   - Gemini SEES the error visually
   - More reliable than text parsing

2. **Visual Hardware Verification**
   - Returns photo of breadboard
   - Gemini SEES LED behavior
   - Can detect timing, brightness, patterns
   - Closes the physical loop

3. **Self-Correction Loop**
   - Compilation fails → Gemini sees error → Fixes code → Retries
   - Runtime error → Gemini sees serial → Regenerates → Reflashes
   - Wrong behavior → Gemini sees photo → Adjusts code → Redeploys

4. **Real Silicon**
   - Not simulation
   - Actual code running on actual hardware
   - Proves AI can work with physical constraints

**Why This Wins:**
✅ Shows complete autonomy (no human in loop)  
✅ Uses multimodal function responses (brand new)  
✅ Self-correcting (true agent behavior)  
✅ Physical world consequences  
✅ 78% SWE-bench coding quality  

**Demo Impact:**
Judge sees Gemini generate code → detect error → fix itself → verify on real hardware → success. All autonomous.

---

### **INNOVATION #3: STREAMING THOUGHT SIGNATURES UI** ⭐⭐⭐⭐⭐

**What It Is:**
Real-time display of Gemini's internal reasoning process using the new `thinking_level` and `streamFunctionCallArguments` features.

**Why It's Revolutionary:**
- Makes AI transparent (builds trust)
- Educational value (teaches debugging process)
- Shows depth of reasoning (not just pattern matching)
- Unique to Gemini 3
- Creates engagement during long operations

**Technical Implementation:**

```python
import asyncio
from flask import Flask, render_template
from flask_socketio import SocketIO
from google.generativeai import GenerativeModel

class ThoughtStreamingUI:
    def __init__(self, model):
        self.model = model
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/')
        def index():
            return render_template('thought_display.html')
    
    def emit_thought(self, thought_type, content):
        """Send thought to browser in real-time"""
        self.socketio.emit('new_thought', {
            'type': thought_type,
            'content': content,
            'timestamp': time.time()
        })
    
    async def stream_gemini_response(self, prompt, **kwargs):
        """Stream Gemini's response with thoughts and function calls"""
        
        config = {
            'thinking_level': 'HIGH',  # Maximum reasoning visibility
            'streamFunctionCallArguments': True,  # See args as they form
            **kwargs
        }
        
        # Emit that thinking has started
        self.emit_thought('status', 'Gemini is thinking...')
        
        # Stream response
        response_stream = self.model.generate_content_stream(
            prompt,
            **config
        )
        
        for chunk in response_stream:
            candidate = chunk.candidates[0]
            
            # Extract thought signatures
            for part in candidate.content.parts:
                # Thought process
                if hasattr(part, 'thought'):
                    self.emit_thought('thought', part.thought)
                    print(f"💭 THOUGHT: {part.thought}")
                
                # Function calls being planned
                if hasattr(part, 'function_call'):
                    fc = part.function_call
                    
                    # Partial arguments as they're streamed
                    if hasattr(fc, 'partial_args'):
                        self.emit_thought('function_planning', {
                            'function': fc.name,
                            'partial_args': str(fc.partial_args)
                        })
                    
                    # Complete function call
                    else:
                        self.emit_thought('function_call', {
                            'function': fc.name,
                            'args': dict(fc.args)
                        })
                        print(f"🔧 CALLING: {fc.name}({fc.args})")
                
                # Text response
                if hasattr(part, 'text'):
                    self.emit_thought('text', part.text)
        
        self.emit_thought('status', 'Thinking complete')
    
    def run_server(self, host='0.0.0.0', port=5000):
        """Start Flask server for thought display"""
        self.socketio.run(self.app, host=host, port=port)
```

**HTML/JavaScript UI (thought_display.html):**

```html



    A.R.I.A. Thought Stream
    
        body {
            background: #0a0a0a;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            padding: 20px;
        }
        
        #thought-container {
            max-width: 1200px;
            margin: 0 auto;
            border: 2px solid #00ff00;
            padding: 20px;
            border-radius: 10px;
        }
        
        .header {
            text-align: center;
            font-size: 24px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .thought-section {
            margin-bottom: 30px;
            padding: 15px;
            background: #1a1a1a;
            border-left: 4px solid #00ff00;
            border-radius: 5px;
        }
        
        .thought-label {
            color: #00aaff;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .thought-content {
            color: #00ff00;
            line-height: 1.6;
            padding-left: 20px;
        }
        
        .function-call {
            background: #2a0a0a;
            border-left: 4px solid #ff6600;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
        }
        
        .function-name {
            color: #ff6600;
            font-weight: bold;
        }
        
        .function-args {
            color: #ffaa00;
            margin-left: 20px;
            font-family: monospace;
        }
        
        .status {
            text-align: center;
            font-size: 18px;
            color: #00aaff;
            padding: 10px;
            background: #0a0a2a;
            border-radius: 5px;
        }
        
        .timestamp {
            color: #666;
            font-size: 12px;
            float: right;
        }
    
    


    
        
            🧠 A.R.I.A. THOUGHT STREAM 🧠
        
        
        
            Waiting for task...
        
        
        
    
    
    
        const socket = io();
        const thoughtsDiv = document.getElementById('thoughts');
        const statusDiv = document.getElementById('status');
        
        socket.on('new_thought', function(data) {
            const timestamp = new Date(data.timestamp * 1000).toLocaleTimeString();
            
            if (data.type === 'status') {
                statusDiv.textContent = data.content;
                statusDiv.style.animation = 'pulse 1s';
            }
            else if (data.type === 'thought') {
                addThought('💭 THINKING', data.content, timestamp);
            }
            else if (data.type === 'function_call') {
                addFunctionCall(data.content, timestamp);
            }
            else if (data.type === 'function_planning') {
                addFunctionPlanning(data.content, timestamp);
            }
            else if (data.type === 'text') {
                addThought('💬 RESPONSE', data.content, timestamp);
            }
            
            // Auto-scroll to bottom
            window.scrollTo(0, document.body.scrollHeight);
        });
        
        function addThought(label, content, timestamp) {
            const section = document.createElement('div');
            section.className = 'thought-section';
            section.innerHTML = `
                
                    ${label}
                    ${timestamp}
                
                ${content}
            `;
            thoughtsDiv.appendChild(section);
        }
        
        function addFunctionCall(data, timestamp) {
            const section = document.createElement('div');
            section.className = 'function-call';
            section.innerHTML = `
                
                    🔧 EXECUTING: ${data.function}
                    ${timestamp}
                
                
                    ${JSON.stringify(data.args, null, 2)}
                
            `;
            thoughtsDiv.appendChild(section);
        }
        
        function addFunctionPlanning(data, timestamp) {
            const section = document.createElement('div');
            section.className = 'function-call';
            section.style.borderLeft = '4px solid #ffaa00';
            section.innerHTML = `
                
                    ⚙️ PLANNING: ${data.function}
                    ${timestamp}
                
                
                    Partial: ${data.partial_args}
                
            `;
            thoughtsDiv.appendChild(section);
        }
    


```

**Integration with Main System:**

```python
# In aria_main.py
from thought_streaming_ui import ThoughtStreamingUI
from google.generativeai import GenerativeModel

# Initialize
model = GenerativeModel('gemini-3.5-flash-exp-0131')
ui = ThoughtStreamingUI(model)

# Start UI server in background thread
import threading
ui_thread = threading.Thread(target=ui.run_server, daemon=True)
ui_thread.start()

# Now use ui.stream_gemini_response() for all Gemini calls
async def debug_circuit(image):
    prompt = """
Analyze this circuit for errors.
Use code execution to zoom into components.
Explain your reasoning step-by-step.
"""
    
    # This will stream all thoughts to the web UI
    await ui.stream_gemini_response(
        [prompt, image],
        tools=['code_execution']
    )
```

**What the User Sees (Live Example):**

```
╔════════════════════════════════════════════════════════╗
║           🧠 A.R.I.A. THOUGHT STREAM 🧠                ║
╠════════════════════════════════════════════════════════╣
║  Status: Gemini is thinking...                         ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  💭 THINKING                            14:32:15       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ I need to analyze this breadboard circuit.        │ ║
║  │ First, I'll identify all components visible.      │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  💭 THINKING                            14:32:16       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ I see:                                             │ ║
║  │ - 1x 555 Timer IC                                  │ ║
║  │ - 1x LED (red)                                     │ ║
║  │ - Multiple resistors                               │ ║
║  │ - Capacitors                                       │ ║
║  │ - Power rails connected                            │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  💭 THINKING                            14:32:17       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ To verify connections, I'll use code execution    │ ║
║  │ to zoom into the IC and trace each pin.           │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  ⚙️ PLANNING: execute_code              14:32:18       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Partial: {"code": "from PIL import Image\n..."}   │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  🔧 EXECUTING: execute_code             14:32:19       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ {                                                  │ ║
║  │   "code": "from PIL import Image, ImageDraw\n     │ ║
║  │            img = Image.open('circuit.jpg')\n      │ ║
║  │            ic_region = img.crop((500,300,700,500))│ ║
║  │            # Analyze pin 7 connection..."          │ ║
║  │ }                                                  │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  💭 THINKING                            14:32:21       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Code execution result: Pin 7 has a red wire       │ ║
║  │ connecting to the 5V rail. According to the       │ ║
║  │ 555 timer datasheet, pin 7 should be discharge    │ ║
║  │ and typically connects through a timing resistor  │ ║
║  │ to positive rail OR to the threshold pin.         │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  💭 THINKING                            14:32:22       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Wait, this direct connection to 5V is incorrect.  │ ║
║  │ This will prevent the timing circuit from working.│ ║
║  │ Pin 7 should connect to pin 6 (threshold) through │ ║
║  │ a resistor, not directly to 5V.                   │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  💭 THINKING                            14:32:23       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ ERROR FOUND: Incorrect wiring of 555 timer        │ ║
║  │ Severity: CRITICAL - circuit will not oscillate   │ ║
║  │ Recommendation: Remove wire from pin 7 to 5V,     │ ║
║  │ connect pin 7 to pin 6 through 10kΩ resistor      │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  ⚙️ PLANNING: move_wire                14:32:24       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Partial: {"from_pin": 7, "to_pin..."}             │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  🔧 EXECUTING: move_wire                14:32:25       ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ {                                                  │ ║
║  │   "from_pin": 7,                                   │ ║
║  │   "from_location": "5V_rail",                      │ ║
║  │   "to_pin": 6,                                     │ ║
║  │   "via_component": "R2_10k"                        │ ║
║  │ }                                                  │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  Status: Thinking complete                             ║
╚════════════════════════════════════════════════════════╝
```

**Why This Wins:**
✅ Transparency builds trust  
✅ Educational (teaches electronics debugging)  
✅ Engaging (fascinating to watch)  
✅ Shows depth of reasoning  
✅ Unique to Gemini 3  
✅ Proves it's not just pattern matching  

**Demo Impact:**
Judge can literally watch Gemini think through the problem like a human engineer would - step by step, considering alternatives, reaching conclusions through reasoning.

---

### **INNOVATION #4: "THE TIME MACHINE" (Predictive SPICE Simulation)** ⭐⭐⭐⭐⭐

**What It Is:**
A.R.I.A. doesn't just see the present; it predicts the future. By extracting circuit topology from camera images, Gemini generates a SPICE netlist, runs a simulation, and predicts component failures *before power is applied*.

**Why It's "Out of This World":**
- **First AI-Vision-to-SPICE Bridge**: Moves from "looking" to "simulating physics".
- **Predictive Failure**: "This capacitor will blow in 400 hours."
- **Deep Reasoning**: Combines visual extraction, code generation, and physics simulation.

**Technical Implementation:**

```python
import PySpice.Logging.Logging as Logging
from PySpice.Spice.Netlist import Circuit
from PySpice.Unit import u_V, u_mA, u_kOhm

class TimeMachinePredictor:
    def __init__(self, gemini_model):
        self.model = gemini_model

    def predict_lifespan(self, workspace_image):
        """
        1. Vision: Identify components (Resistors, LEDs, Caps)
        2. Logic: Create Netlist (Python code generation)
        3. Physics: Run PySpice simulation
        4. Verdict: Compare results vs Datasheet limits
        """
        
        # Step 1: Gemini writes Python to extract netlist
        prompt = """
        ANALYZE THIS CIRCUIT IMAGE for simulation.
        1. Identify components (R, C, LED, V_source).
        2. Estimate values (Color bands, markings).
        3. Trace connections (Nodes).
        4. OUTPUT: Python code using PySpice to simulate this circuit.
        """
        
        # ... (Gemini generates PySpice code) ...
        
        # Step 2: Gemini's Generated Code runs locally
        # Example generated simulation:
        circuit = Circuit('Extracted Breadboard')
        circuit.V('input', '5V', circuit.gnd, 5@u_V)
        circuit.R(1, '5V', 'n1', 100@u_kOhm) # Gemini saw brown-black-yellow
        circuit.LED(1, 'n1', circuit.gnd, model='red_led')
        
        simulator = circuit.simulator(temperature=25, nominal_temperature=25)
        analysis = simulator.operating_point()
        
        # Step 3: Failure Analysis
        current_led = analysis['n1'] # Calculate node voltage/current
        
        return report
```

**Demo Scenario:**
1.  **Scene**: A breadboard with a 5V source and an LED with a **1Ω resistor** (effectively shorted).
2.  **User**: "Will this circuit survive?"
3.  **Gemini**:
    *   *Vision*: "Resistor bands are Black-Brown-Black (1Ω)."
    *   *Simulation*: "Current = 5V / 1Ω = 5 Amps."
    *   *Prediction*: "CRITICAL FAILURE DETECTED. LED Max Current is 0.02A. Circuit is drawing 5.00A."
    *   *Verdict*: "LED will explode immediately upon power-up."
4.  **Result**: A.R.I.A. prevents the user from turning on the power supply.

---

## 8. ADDITIONAL CORE FEATURES

### **Feature 4: ROS-Gen (Dynamic Node Creation)**

**Concept:**
Gemini generates complete, working ROS2 nodes from natural language descriptions, then deploys them to the running system.

**Implementation Approach: Template-Based (Achievable)**

```python
class ROSNodeGenerator:
    def __init__(self, gemini_model):
        self.model = gemini_model
        self.templates = self.load_templates()
    
    def load_templates(self):
        """Pre-defined ROS2 node templates"""
        return {
            'subscriber_node': """
#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from {msg_package}.msg import {msg_type}

class {class_name}(Node):
    def __init__(self):
        super().__init__('{node_name}')
        self.subscription = self.create_subscription(
            {msg_type},
            '{topic_name}',
            self.callback,
            10)
        self.get_logger().info('{node_name} started')
    
    def callback(self, msg):
        {callback_code}

def main(args=None):
    rclpy.init(args=args)
    node = {class_name}()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
""",
            
            'publisher_node': """
#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from {msg_package}.msg import {msg_type}

class {class_name}(Node):
    def __init__(self):
        super().__init__('{node_name}')
        self.publisher = self.create_publisher({msg_type}, '{topic_name}', 10)
        self.timer = self.create_timer({publish_rate}, self.timer_callback)
        self.get_logger().info('{node_name} started')
    
    def timer_callback(self):
        msg = {msg_type}()
        {publish_code}
        self.publisher.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = {class_name}()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
""",
            
            'service_node': """
#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from {srv_package}.srv import {srv_type}

class {class_name}(Node):
    def __init__(self):
        super().__init__('{node_name}')
        self.srv = self.create_service(
            {srv_type},
            '{service_name}',
            self.service_callback)
        self.get_logger().info('{node_name} service ready')
    
    def service_callback(self, request, response):
        {service_code}
        return response

def main(args=None):
    rclpy.init(args=args)
    node = {class_name}()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
"""
        }
    
    def generate_node(self, user_request):
        """Generate ROS2 node from natural language"""
        
        # First, ask Gemini to select template and fill parameters
        prompt = f"""
You are a ROS2 expert.

USER REQUEST:
{user_request}

AVAILABLE TEMPLATES:
{list(self.templates.keys())}

TASK:
1. Select the most appropriate template
2. Fill in all required parameters
3. Generate the callback/logic code

OUTPUT FORMAT (JSON):
{{
    "template": "template_name",
    "parameters": {{
        "class_name": "...",
        "node_name": "...",
        "topic_name": "...",
        "msg_type": "...",
        "msg_package": "...",
        "callback_code": "..."
    }}
}}
"""
        
        response = self.model.generate_content(
            prompt,
            tools=['code_execution']  # Validate syntax
        )
        
        # Parse JSON response
        import json
        node_spec = json.loads(response.text)
        
        # Fill template
        template = self.templates[node_spec['template']]
        code = template.format(**node_spec['parameters'])
        
        # Save to file
        node_file = Path(f"~/aria_ws/src/aria_nodes/{node_spec['parameters']['node_name']}.py")
        node_file.write_text(code)
        os.chmod(node_file, 0o755)  # Make executable
        
        # Launch node
        subprocess.Popen(['python3', str(node_file)])
        
        return node_spec, code
```

**Demo Scenario:**

```
User: "Create a safety monitor that stops the arm if workspace temperature exceeds 60°C"

Gemini:
1. Selects "subscriber_node" template
2. Fills parameters:
   - node_name: thermal_safety_monitor
   - topic_name: /thermal_sensor/temperature
   - msg_type: Float32
   - callback_code: 
     "if msg.data > 60.0:
          self.get_logger().warn('TEMPERATURE CRITICAL!')
          self.emergency_stop_publisher.publish(EmergencyStop())"

3. Generates complete node
4. Node is deployed and starts monitoring
5. Shows live ROS2 topic: ros2 topic echo /thermal_sensor/temperature
```

**Why Include This:**
- Shows Gemini 3's multi-tool orchestration
- Practical use case (safety monitoring)
- Demonstrates code generation quality
- Easy to demo (show live ROS topics)

---

### **Feature 5: Workspace Reset (Bulldozer Mode)**

**Concept:**
Autonomous cleanup where the arm sweeps the workspace clear, organizing components into designated zones.

**Implementation:**

```python
def workspace_reset():
    """Autonomous workspace cleanup"""
    
    # Step 1: Gemini analyzes workspace
    prompt = """
Analyze this workspace and create a cleanup plan.

ZONES AVAILABLE:
- Wire coil station (top-left)
- Tool holder (top-right)
- Component bins (bottom)
- Trash zone (far right)

CURRENT WORKSPACE:
See overhead camera image.

TASK: Generate a list of objects and their destination zones.
"""
    
    analysis = model.generate_content([prompt, workspace_image])
    
    # Step 2: Execute cleanup plan
    # NEMA 17 base does smooth sweeping motion
    # Gripper organizes specific items
    
    # Step 3: Verify cleanup
    after_image = capture_workspace()
    verification = model.generate_content([
        "Compare before/after. Is workspace organized?",
        workspace_image,
        after_image
    ])
```

---

### **Feature 6: Voice Control via ESP32-S3**

**Implementation:**

```python
# On ESP32-S3-BOX-3
from esp_box import Box

box = Box()

# Wake word detection
box.set_wake_word("Hey ARIA")

while True:
    if box.wake_word_detected():
        command = box.listen()  # Speech-to-text
        
        # Send to Pi via MQTT
        mqtt_client.publish('aria/voice_command', command)
        
        # Wait for response
        response = mqtt_client.wait_for('aria/response')
        box.speak(response)  # Text-to-speech
```

---

## 9. GEMINI 3 INTEGRATION STRATEGY

### **9.1 Model Selection**

**Gemini 3.5 Flash (Primary Model):**
- Use for: Real-time vision, quick decisions, agentic vision
- Latency: ~1-2 seconds
- Cost: $0.10 / 1M input tokens
- Features: Code execution, streaming, thinking levels

**Gemini 3.5 Pro (Complex Tasks):**
- Use for: Deep circuit analysis, firmware generation, multi-step planning
- Latency: ~3-5 seconds
- Cost: Higher, but worth it for complex reasoning
- Features: Extended thinking, better accuracy

### **9.2 API Configuration**

```python
import google.generativeai as genai

genai.configure(api_key=os.environ['GEMINI_API_KEY'])

# Flash model for speed
flash_model = genai.GenerativeModel(
    'gemini-3.5-flash-exp-0131',
    tools=['code_execution'],
    generation_config={
        'temperature': 1.0,  # CRITICAL: Keep at 1.0 for Gemini 3
        'thinking_level': 'MEDIUM',  # Balance speed vs reasoning
    }
)

# Pro model for depth
pro_model = genai.GenerativeModel(
    'gemini-3.5-pro-exp-0215',
    tools=['code_execution'],
    generation_config={
        'temperature': 1.0,
        'thinking_level': 'HIGH',  # Maximum reasoning
    }
)
```

### **9.3 Function Calling Schema**

Define all robot capabilities as tools:

```python
tools = [
    {
        'name': 'move_arm_to',
        'description': 'Move robot arm to workspace coordinates',
        'parameters': {
            'x': {'type': 'number', 'description': 'X coordinate in mm'},
            'y': {'type': 'number', 'description': 'Y coordinate in mm'},
            'z': {'type': 'number', 'description': 'Z coordinate (height) in mm'},
        }
    },
    {
        'name': 'grasp_object',
        'description': 'Close gripper to grasp object',
        'parameters': {
            'force': {'type': 'number', 'description': 'Grip force 0-100%'},
        }
    },
    {
        'name': 'release_object',
        'description': 'Open gripper to release object',
        'parameters': {}
    },
    {
        'name': 'capture_close_up',
        'description': 'Capture zoomed photo of specific component using gripper camera',
        'parameters': {
            'component_name': {'type': 'string'},
            'zoom_level': {'type': 'number', 'description': '1-10x zoom'},
        }
    },
    {
        'name': 'compile_and_flash',
        'description': 'Compile code and flash to Teensy MCU',
        'parameters': {
            'code': {'type': 'string', 'description': 'Arduino/Teensy code'},
            'board': {'type': 'string', 'description': 'Board type (e.g., teensy41)'},
        }
    },
    {
        'name': 'capture_serial_screenshot',
        'description': 'Capture screenshot of serial monitor output',
        'parameters': {
            'duration_seconds': {'type': 'number'},
        }
    },
    {
        'name': 'capture_breadboard_photo',
        'description': 'Take overhead photo of breadboard/circuit',
        'parameters': {}
    },
    # ... 50+ more tools for complete robot control
]
```

### **9.4 Multimodal Function Responses**

**Key Innovation: Returning IMAGES from function calls**

```python
# When Gemini calls a function
function_call = response.candidates[0].content.parts[0].function_call

if function_call.name == 'capture_close_up':
    # Execute the function
    image = robot.capture_close_up(**function_call.args)
    
    # Return IMAGE as function response (NEW IN GEMINI 3!)
    function_response = {
        'name': 'capture_close_up',
        'response': {
            'image': image,  # Can now be PIL Image or base64
            'success': True,
            'metadata': {'zoom': 5, 'focus': 'sharp'}
        }
    }
    
    # Send back to Gemini - it will SEE the image
    next_response = model.generate_content([
        original_prompt,
        function_response
    ])
    
    # Gemini can now analyze the image it requested!
```

### **9.5 Prompt Engineering Best Practices**

**For Circuit Debugging:**

```python
circuit_debug_prompt = """
You are an expert electronics engineer with active vision capabilities.

CONTEXT:
- Breadboard circuit image attached
- Reference schematic attached (if available)
- User is building: {project_description}

YOUR CAPABILITIES:
- code_execution: Write Python to zoom, crop, measure, annotate images
- Thinking levels: Show your reasoning process
- Function calling: Request close-up photos, manipulate wires

TASK:
1. Analyze the circuit systematically
2. Compare to schematic (if provided) or common circuit patterns
3. Identify any wiring errors, component misplacements, or potential issues
4. For each error:
   - Explain what's wrong
   - Explain why it's wrong
   - Suggest fix
   - Assess severity (CRITICAL/WARNING/INFO)

APPROACH:
- Start broad (overall topology)
- Then zoom into specific components using code_execution
- Check power connections first (most critical)
- Verify IC pin connections
- Check component orientations
- Validate connections match schematic

OUTPUT:
- List of errors found (or confirmation if circuit is correct)
- For each error: location, description, severity, fix
- If critical errors found: recommend NOT powering on until fixed
"""
```

**For Firmware Generation:**

```python
firmware_gen_prompt = """
You are an expert embedded systems programmer specializing in Teensy 4.1.

TASK: Generate production-quality Teensy firmware for:
{user_request}

REQUIREMENTS:
- Use Teensy 4.1 specific libraries and optimizations
- Include proper pin definitions (#define for clarity)
- Add comprehensive serial debugging output
- Use best practices (const, volatile where needed)
- Optimize for 600MHz ARM Cortex-M7
- Include error handling
- Add comments explaining logic

TEENSY 4.1 SPECIFICS:
- Digital pins: 0-33 (some 5V tolerant)
- Analog inputs: 0-13 (3.3V max)
- PWM pins: Most digital pins
- SPI: pins 11,12,13 (+ alt 26,39,27)
- I2C: pins 18,19 (+ others)
- UART: Multiple serial ports

OUTPUT FORMAT:
- ONLY the .ino file contents
- NO markdown code fences
- NO explanations outside comments
- Ready to compile and flash

Use code_execution to validate syntax before responding.
"""
```

---

## 10. IMPLEMENTATION DETAILS

### **10.1 Development Environment Setup**

**System Requirements:**
- Raspberry Pi 5 (8GB RAM minimum)
- Ubuntu 22.04 LTS (64-bit)
- Python 3.10+
- ROS 2 Humble
- 64GB microSD card (for OS + workspace)

**Installation Script:**

```bash
#!/bin/bash
# install_aria.sh

set -e  # Exit on error

echo "======================================"
echo "A.R.I.A. System Installation"
echo "======================================"

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install ROS 2 Humble
echo "Installing ROS 2 Humble..."
sudo apt install -y software-properties-common
sudo add-apt-repository universe
sudo apt update
sudo apt install -y curl gnupg lsb-release

sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
    -o /usr/share/keyrings/ros-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) \
signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" \
    | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

sudo apt update
sudo apt install -y ros-humble-desktop
sudo apt install -y ros-humble-moveit

# Install Arduino CLI
echo "Installing Arduino CLI..."
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
sudo mv bin/arduino-cli /usr/local/bin/
arduino-cli core update-index
arduino-cli core install teensy:avr

# Install Teensy Loader CLI
echo "Installing Teensy Loader CLI..."
cd /tmp
git clone https://github.com/PaulStoffregen/teensy_loader_cli.git
cd teensy_loader_cli
make
sudo cp teensy_loader_cli /usr/local/bin/
cd ~

# Install Python dependencies
echo "Installing Python packages..."
pip3 install --upgrade pip
pip3 install \
    google-generativeai>=0.8.0 \
    opencv-python>=4.8.0 \
    pillow>=10.0.0 \
    numpy>=1.24.0 \
    pyserial>=3.5 \
    pyudev>=0.24.0 \
    paho-mqtt>=1.6.0 \
    flask>=3.0.0 \
    flask-socketio>=5.3.0

# Setup ROS workspace
echo "Setting up ROS workspace..."
mkdir -p ~/aria_ws/src
cd ~/aria_ws
colcon build
echo "source ~/aria_ws/install/setup.bash" >> ~/.bashrc

# Create project structure
echo "Creating project structure..."
mkdir -p ~/aria_ws/src/aria_nodes/{config,launch,scripts}
mkdir -p ~/aria_ws/src/aria_nodes/aria_nodes

# Set permissions
sudo usermod -a -G dialout $USER  # For serial port access

echo "======================================"
echo "Installation complete!"
echo "Please reboot for changes to take effect."
echo "======================================"
```

### **10.2 Project File Structure**

```
~/aria_ws/
├── src/
│   └── aria_nodes/
│       ├── package.xml
│       ├── setup.py
│       ├── aria_nodes/
│       │   ├── __init__.py
│       │   ├── aria_main.py                 # Main orchestrator
│       │   ├── gemini_interface.py          # Gemini API wrapper
│       │   ├── circuit_debugger.py          # Visual code execution
│       │   ├── teensy_flasher.py            # Auto-flash pipeline
│       │   ├── thought_streaming_ui.py      # Real-time thought display
│       │   ├── robot_controller.py          # ROS2 robot control
│       │   ├── vision_processor.py          # Camera/image processing
│       │   ├── voice_interface.py           # ESP32 communication
│       │   └── ros_gen.py                   # Dynamic node generation
│       ├── config/
│       │   ├── robot_config.yaml
│       │   ├── camera_config.yaml
│       │   └── gemini_config.yaml
│       ├── launch/
│       │   └── aria_system.launch.py
│       ├── scripts/
│       │   ├── calibrate_camera.py
│       │   ├── test_arm.py
│       │   └── emergency_stop.py
│       └── web/
│           └── templates/
│               └── thought_display.html
├── .env                                      # API keys (gitignored)
└── README.md

/tmp/aria_generated/                          # Temporary firmware files
    ├── aria_firmware.ino
    └── aria_firmware.ino.hex
```

### **10.3 Core Modules**

**aria_main.py - Main Orchestrator:**

```python
#!/usr/bin/env python3
"""
A.R.I.A. Main Orchestrator
Coordinates all subsystems and manages task execution
"""

import rclpy
from rclpy.node import Node
import asyncio
from google.generativeai import GenerativeModel
import os

from aria_nodes.gemini_interface import GeminiInterface
from aria_nodes.circuit_debugger import CircuitDebugger
from aria_nodes.teensy_flasher import TeensyAutoFlashPipeline
from aria_nodes.thought_streaming_ui import ThoughtStreamingUI
from aria_nodes.robot_controller import RobotController
from aria_nodes.vision_processor import VisionProcessor
from aria_nodes.voice_interface import VoiceInterface

class ARIAOrchestrator(Node):
    def __init__(self):
        super().__init__('aria_orchestrator')
        
        self.get_logger().info("Initializing A.R.I.A. System...")
        
        # Initialize Gemini
        self.gemini = GeminiInterface(
            api_key=os.getenv('GEMINI_API_KEY'),
            flash_model='gemini-3.5-flash-exp-0131',
            pro_model='gemini-3.5-pro-exp-0215'
        )
        
        # Initialize subsystems
        self.circuit_debugger = CircuitDebugger(self.gemini.flash_model)
        self.teensy_flasher = TeensyAutoFlashPipeline(self.gemini.flash_model)
        self.thought_ui = ThoughtStreamingUI(self.gemini.flash_model)
        self.robot = RobotController(self)
        self.vision = VisionProcessor(self)
        self.voice = VoiceInterface(self)
        
        # Start thought streaming UI in background
        self.thought_ui.start_server_async()
        
        # State
        self.current_task = None
        self.workspace_state = {}
        
        self.get_logger().info("A.R.I.A. System Ready! 🚀")
    
    async def process_command(self, command):
        """Main command processing loop"""
        self.get_logger().info(f"Received command: {command}")
        
        # Classify command intent using Gemini
        intent = await self.classify_intent(command)
        
        # Route to appropriate handler
        if intent == 'circuit_debug':
            await self.handle_circuit_debug(command)
        
        elif intent == 'firmware_gen':
            await self.handle_firmware_generation(command)
        
        elif intent == 'workspace_org':
            await self.handle_workspace_organization(command)
        
        elif intent == 'ros_gen':
            await self.handle_ros_node_generation(command)
        
        else:
            self.get_logger().warn(f"Unknown intent: {intent}")
    
    async def classify_intent(self, command):
        """Use Gemini to classify user intent"""
        prompt = f"""
Classify this user command into ONE category:

COMMAND: {command}

CATEGORIES:
- circuit_debug: Analyzing, checking, or debugging circuits
- firmware_gen: Creating, generating, or modifying MCU firmware
- workspace_org: Organizing, cleaning, or arranging workspace
- ros_gen: Creating ROS2 nodes or robot behaviors

OUTPUT: Only the category name, nothing else.
"""
        
        response = await self.gemini.flash_model.generate_content_async(prompt)
        return response.text.strip().lower()
    
    async def handle_circuit_debug(self, command):
        """Handle circuit debugging requests"""
        # Capture workspace
        image = await self.vision.capture_overhead()
        
        # Run agentic vision debugging
        result = await self.circuit_debugger.debug_circuit(
            image,
            command,
            stream_thoughts=True
        )
        
        # If errors found, offer to fix
        if result.errors:
            for error in result.errors:
                if error.severity == 'CRITICAL':
                    # Autonomous fix
                    await self.robot.fix_wiring_error(error)
        
        # Report results
        await self.voice.speak(result.summary)
    
    async def handle_firmware_generation(self, command):
        """Handle firmware generation requests"""
        # Run full Teensy auto-flash pipeline
        success, analysis = await self.teensy_flasher.run_full_pipeline(
            user_request=command,
            max_iterations=3
        )
        
        if success:
            await self.voice.speak("Firmware deployed successfully!")
        else:
            await self.voice.speak(f"Firmware deployment failed: {analysis}")

def main(args=None):
    rclpy.init(args=args)
    
    # Create node
    orchestrator = ARIAOrchestrator()
    
    # Run async event loop
    try:
        rclpy.spin(orchestrator)
    except KeyboardInterrupt:
        pass
    
    orchestrator.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

---

## 11. DEMO SCENARIOS

### **Demo 1: "The Money Shot" - Complete Autonomous Debugging**

**Duration:** 3 minutes  
**Goal:** Show end-to-end autonomy with all 3 killer innovations

**Setup (15 seconds):**
- Messy workspace with Arduino project
- Breadboard with intentional wiring error (LED on 5V instead of 3.3V)
- Reference schematic visible on screen
- Teensy 4.1 unplugged, ready nearby

**Act 1: Agentic Vision Debugging (70 seconds)**

```
[Overhead camera view shown]

User (voice): "A.R.I.A., check my Arduino circuit for errors"

[Thought Stream UI appears on screen]

ARIA: "Analyzing circuit..."

[Thought Stream shows]:
💭 "I see an Arduino Uno, breadboard, LED, resistors..."
💭 "Need to verify LED power connection"
💭 "Using code execution to zoom into LED pins..."

[Screen shows Python code being written to crop image]

💭 "LED anode connected to red wire"
💭 "Tracing red wire... connects to 5V rail"
💭 "According to schematic, LED should be on 3.3V rail"
💭 "ERROR FOUND: Overvoltage condition"
💭 "5V on LED rated for 3.3V will cause premature failure"
💭 "Severity: WARNING - will work but reduce LED lifespan"

[Annotated image shown with red circle around error]

ARIA (voice): "Error detected. LED connected to 5V instead of 3.3V. 
               This will shorten LED lifespan. Should I fix it?"

User: "Yes, fix it and generate firmware to blink it"
```

**Act 2: Autonomous Fix (30 seconds)**

```
[Robot arm moves into frame]

💭 "Planning wire removal and replacement"
🔧 CALLING: move_arm_to(x=245, y=180, z=20)
🔧 CALLING: grasp_object(force=30)
💭 "Removing wire from 5V rail"
🔧 CALLING: move_arm_to(x=220, y=150, z=20)
🔧 CALLING: release_object()
💭 "Placing wire on 3.3V rail"

[Shows arm moving wire]

🔧 CALLING: capture_verification_photo()

💭 "Verification: Wire now on 3.3V rail"
💭 "Circuit corrected. Safe to proceed."

ARIA: "Circuit fixed. Generating firmware..."
```

**Act 3: Teensy Auto-Flash (80 seconds)**

```
[Code editor appears showing generated firmware]

💭 "Generating Teensy 4.1 firmware for LED blink"
💭 "Using pin 13 with PWM for smooth fading"
💭 "Adding serial debugging output"

[Shows generated code]

ARIA: "Please plug in your Teensy..."

[User plugs in Teensy - USB detection shown]

ARIA: "Teensy detected. Compiling..."

🔧 CALLING: compile_and_flash(code=...)

[Terminal shows compilation]

❌ "Compilation error detected"

[Screenshot of error shown]

💭 "Error: analogWriteResolution not declared"
💭 "This is a Teensy-specific function"
💭 "Need to add proper library"
💭 "Regenerating with Teensy.h include..."

✅ "Compilation successful"

ARIA: "Flashing firmware..."

[Progress bar shown]

✅ "Flash complete. Verifying..."

[Serial monitor screenshot shown to Gemini]
[Photo of breadboard with LED shown to Gemini]

💭 "Serial output shows: 'LED initialized, PWM active'"
💭 "Photo shows LED smoothly fading"
💭 "Behavior matches requirements"

ARIA: "Firmware deployed successfully! LED is now fading at 2Hz."

[LED visibly fading on breadboard]
```

**Closing (5 seconds)**

```
ARIA: "Task complete. Circuit debugged, fixed, and firmware deployed 
       autonomously. No components damaged."

[Fade to title screen]
"A.R.I.A. - The Cursor for the Physical World"
"Powered by Gemini 3"
```

**Why This Demo Wins:**
✅ Shows all 3 killer innovations in one flow  
✅ Visible self-correction (compilation error fix)  
✅ Physical world impact (wire moved, LED working)  
✅ Transparent reasoning (thought stream throughout)  
✅ Complete autonomy (no human intervention after initial command)  
✅ Under 3 minutes  

---

### **Demo 2: "Rapid Fire" - Multiple Quick Tasks**

**Duration:** 3 minutes  
**Goal:** Show versatility and speed

```
Task 1 (30s): "Find the 10kΩ resistor"
→ Visual search with code execution
→ Draws bounding box
→ "Found at coordinates (320, 215)"

Task 2 (30s): "Create firmware to read temperature sensor"
→ Generates code
→ Auto-compiles
→ "Code ready, waiting for Teensy..."

Task 3 (40s): "Organize loose wires"
→ Detects 12 wires
→ Plans coiling strategy
→ Arm coils and places in holder

Task 4 (30s): "Check if capacitor is correct value"
→ Zooms in with code execution
→ Reads markings using OCR
→ "104 = 100nF, matches schematic"

Task 5 (50s): "Create ROS node to monitor arm temperature"
→ Generates subscriber node
→ Deploys node
→ Shows live ROS topic: ros2 topic echo /thermal_warning
```