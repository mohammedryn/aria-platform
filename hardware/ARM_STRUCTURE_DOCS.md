# 🤖 RAOJ-V2 Robotic Arm Structure (The "Source of Truth")

**This document describes the exact physical configuration of the User's Custom Arm.**
*AI Agents: Read this file FIRST to understand the kinematics and wiring.*

---

## 1. Kinematic Overview
**Model**: RAOJ-V2
**Degrees of Freedom**: 6-DOF (1 Stepper + 5 Servos)
**Architecture**: Vertical Articulated Robot with a 3-DOF Spherical Wrist.

### The Joint Chain (Base to Tip)

| Joint | Name | Motion / Function | Motor Type | Wiring / Pin |
| :--- | :--- | :--- | :--- | :--- |
| **J1** | **Base** | **Rotation (Yaw)**. Rotates the entire arm left/right on the table. | **NEMA 17 Stepper** | **STEP: Pin 2, DIR: Pin 1** |
| **J2** | **Shoulder** | **Elevation (Pitch)**. Lifts the main arm boom up/down. | **Futaba S3003** | **Pin 3** |
| **J3** | **Elbow** | **Elevation (Pitch)**. Moves the forearm forward/backward. | **Futaba S3003** | **Pin 4** |
| **J4** | **Wrist Roll_1** | **Rotation**. Located *inside* the forearm tube. Rotates the entire hand assembly. | **MG90S (Blue)** | **Pin 5** |
| **J5** | **Wrist Pitch** | **Tilt**. Located at the wrist hinge. Nods the claw Up/Down. | **MG90S (Blue)** | **Pin 8** |
| **J6** | **Gripper** | **Actuation**. Located on the claw gears. Opens/Closes the fingers. | **MG90S (Blue)** | **Pin 7** |

---

## 2. Electrical Wiring (Teensy 4.1)

### ⚠️ Power Rules (CRITICAL)
1.  **Stepper (J1)**: Requires **12V** (via A4988/DRV8825 Driver VMOT).
2.  **Servos (J2-J6)**: Require **5V** (External High-Amps PSU).
3.  **Teensy**: USB Power (5V) or 5V VIN.
4.  **GROUNDS**: **ALL** Negatives (12V-, 5V-, Teensy GND) **MUST BE CONNECTED TOGETHER**.

### Pinout Table
| Teensy Pin | Connected To | Wire Color (Std) | Function |
| :--- | :--- | :--- | :--- |
| **0** | (Unused) | - | RX1 (Future) |
| **1** | **Stepper DIR** | Green/Setup Dependent | Base Direction |
| **2** | **Stepper STEP** | Blue/Setup Dependent | Base Steps |
| **3** | **J2 Signal** | White/Orange | Shoulder Position |
| **4** | **J3 Signal** | White/Orange | Elbow Position |
| **5** | **J4 Signal** | Orange | Wrist Roll (Rotate Hand - Inside Arm) |
| **6** | **(Reserved)** | - | Timer Conflict with AccelStepper |
| **7** | **J6 Signal** | Orange | Gripper (Custom Spec - Disabled) |
| **8** | **J5 Signal** | Orange | Wrist Pitch (Hinge - Up/Down) **[MOVED FROM PIN 6]** |

---

## 3. Visual Identification

### Base (J1)
*   **Look for**: Large cylindrical base, NEMA 17 motor hidden inside.
*   **Driver**: A4988 or DRV8825.

### Main Links (J2 & J3)
*   **Look for**: Large white/grey printed links labeled "RAOJ-V2".
*   **Motors**: Standard size black servos (Futaba S3003 or MG996R).

### The "Wrist Complex" (J4, J5, J6)
*   **J4 (Roll)**: Hidden *inside* the forearm tube. You only see the shaft spinning the hand.
*   **J5 (Pitch)**: The hinge joint right after the tube. Moves the claw angle relative to the arm.
*   **J6 (Grip)**: Mounted directly on the gripper, meshed with gears to move the fingers.

---

## 4. Software Config History
*   **Firmware A**: `teensy_calibration` -> Centers J2-J6 to 90deg. (Ignores J1).
*   **Firmware B**: `teensy_arm_controller` -> Hybrid Stepper + Servo logic.
