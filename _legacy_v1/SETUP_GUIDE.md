# 🛠️ A.R.I.A Hardware Setup & Flashing Guide

This guide covers how to connect your Hybrid Arm (Stepper + Servos) and how to upload the firmware from Windows.

---

## 🔌 1. Wiring Connections

**⚠️ CRITICAL**: All grounds (GND) must be connected together (Teensy GND + 12V PSU GND + 5V PSU GND).

### **A. Teensy 4.1 Pinout**
| Pin | Function | Connect To | Notes |
| :--- | :--- | :--- | :--- |
| **0** | RX1 | RPi TX | (Future use) |
| **1** | **DIR** | **Stepper Driver DIR** | Base Direction |
| **2** | **STEP** | **Stepper Driver STEP** | Base Steps |
| **3** | PWM | **Shoulder Servo** (Signal) | J2 |
| **4** | PWM | **Elbow Servo** (Signal) | J3 |
| **5** | PWM | **Wrist Roll** (Rotate Hand, inside arm) | J4 |
| **6** | PWM | **Wrist Pitch** (Hinge, moves Up/Down) | J5 |
| **7** | PWM | **Gripper** (Custom/Disabled for now) | J6 |
| **GND** | Ground | **Common Ground** | **CRITICAL** |
| **VIN**| 5V In | 5V Power Supply | Optional (or use USB) |

### **B. Stepper Driver (A4988 / DRV8825)**
*   **VMOT**: Connect to **12V Positive**.
*   **GND**: Connect to **12V Ground**.
*   **2B, 2A, 1A, 1B**: Connect to Stepper Motor Coils.
*   **VDD**: Connect to **Teensy 3.3V** (Logic Power).
*   **GND**: Connect to **Teensy GND**.
*   **STEP**: Connect to **Teensy Pin 2**.
*   **DIR**: Connect to **Teensy Pin 1**.
*   **MS1/MS2/MS3**: Connect to High/Low (or leave open for full step) depending on microstepping config.

### **C. Servos (J2 - Gripper)**
*   **Red Wire (+)**: Connect to **External 5V PSU Positive**. (**DO NOT POWER FROM TEENSY**)
*   **Brown/Black Wire (-)**: Connect to **Common Ground**.
*   **Orange/Yellow (Signal)**: Connect to Teensy Pins **3, 4, 5, 6, 7** (see above).

---

## 💻 2. Flashing Process (Windows)

You have two firmwares. Follow this **exact order**.

### **Step 1: Calibration (The "90° Snap")**
*   **Goal**: Force all servo pins to output 90° signal so you can attach the horns in the correct CENTER position.
*   **Note**: Pin 2 (Base) is disabled in this mode (safe for Stepper).
*   **Procedure**:
    1.  Open Command Prompt / Terminal.
    2.  Navigate to folder:
        ```cmd
        cd D:\aria-swarm\firmware\teensy_calibration
        ```
    3.  Connect Teensy via USB.
    4.  Upload:
        ```cmd
        pio run -t upload
        ```
    5.  **Assembly Action**: With power ON, attach servo horns to make the arm straight/centered.

### **Step 2: The Controller (The "Real Brain")**
*   **Goal**: Run the Hybrid Stepper + Servo logic.
*   **Procedure**:
    1.  Navigate to folder:
        ```cmd
        cd D:\aria-swarm\firmware\teensy_arm_controller
        ```
    2.  Upload:
        ```cmd
        pio run -t upload
        ```
    3.  **Test**: Open Serial Monitor (VS Code or Arduino IDE) at **115200 baud** to send commands.

---

## ⚡ Safety Checklist
- [ ] **Capacitor**: 1000uF capacitor installed across 5V Servo rail.
- [ ] **Common Ground**: Teensy GND is connected to PSU GND.
- [ ] **Voltage**: 12V is ONLY for Stepper Driver VMOT. 5V is for Servos.
- [ ] **USB**: Teensy is connected to PC for data/power.

