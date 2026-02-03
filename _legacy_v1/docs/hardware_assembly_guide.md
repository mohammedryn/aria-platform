# 🛠️ A.R.I.A. Hardware Assembly & Calibration Guide

**Status**: Phase 1 Checking  
**Safety**: ⚠️ **DISCONNECT POWER** while wiring. Only power on when verifying.

---

## 1. Components
*   **Controller**: Teensy 4.1
*   **Power**: 5V High-Current Power Supply (UBEC or Lab Bench) - *Do not power Servos from Teensy USB!*
*   **Actuators**: 6x Digital Servos (MG996R or similar)

## 2. Wiring Diagram

### Servo Connections
| Joint Name | Teensy Pin | Power | GND |
| :--- | :--- | :--- | :--- |
| **Base** | Pin 2 | 5V Ext | GND Ext |
| **Shoulder** | Pin 3 | 5V Ext | GND Ext |
| **Elbow** | Pin 4 | 5V Ext | GND Ext |
| **Wrist Pitch** | Pin 5 | 5V Ext | GND Ext |
| **Wrist Roll** | Pin 6 | 5V Ext | GND Ext |
| **Gripper** | Pin 7 | 5V Ext | GND Ext |

**Grounding Rule**: You **MUST** connect the Power Supply GND to the Teensy GND. If you don't, the signals won't work and servos will jitter violently.

---

## 3. Flashing the Calibration Firmware

1.  **Open Project**:
    *   Open `aria-swarm/firmware/teensy_calibration` in VS Code.
    *   Ensure the **PlatformIO** extension is installed and active.

2.  **Connect Teensy**:
    *   Plug Teensy 4.1 into laptop via USB.

3.  **Upload**:
    *   Click the **PlatformIO Alien Icon** (Left Sidebar).
    *   Under `env:teensy41`, click **Upload**.
    *   *Note: If asked, press the physical button on the Teensy to enter bootloader mode.*

4.  **Verify**:
    *   The Orange LED on the Teensy should start **blinking slowly** (1 second on/off).
    *   This means it is effectively sending "Stay at 90°" signals to Pins 2-7.

---

## 4. Assembly Process (The "Zeroing")

**Critical**: Do this ONE SERVO at a time.

1.  **Power ON** the external 5V supply for servos.
2.  **Plug in Servo 1 (Base)** to Pin 2.
    *   The servo motor will immediately snap to its center position and holding there (stiffness).
    *   If it buzzes but moves freely, check wiring. It should fight you if you try to turn it.
3.  **Attach the Horn/Arm**:
    *   Place the plastic horn or metal arm segment so it aligns with your desired "Center" (usually straight forward or straight up).
    *   Screw it in.
4.  **Repeat** for all servos (Shoulder -> Elbow -> Wrists).

### Expected "Center" Postures
*   **Base**: Facing Front (0 degree offset relative to robot front).
*   **Shoulder**: Vertical / Upright.
*   **Elbow**: 90 degree angle (L-shape) OR Straight (depending on your mechanical design). *Standard is L-Shape.*
*   **Gripper**: Half-open.

---

## 5. Troubleshooting
*   **Jittering**: Check Ground (GND) connection between Teensy and PSU.
*   **Brownout (Teensy reboots)**: Servos are pulling too much power. Ensure Teensy is on USB power and Servos are on External power.
*   **Not moving**: Check Pin numbers in `src/main.cpp`.
