#include <Arduino.h>
#include <Servo.h>

// =========================================================================
// A.R.I.A. Arm Calibration Firmware
// =========================================================================
// Purpose: Holds all servos at exactly 90 degrees (CENTER)
// Usage:   Upload this, Power ON, THEN attach servo horns.
// =========================================================================

// --- Pin Definitions ---
// Uses PWM capable pins on Teensy 4.1
// const int PIN_BASE       = 2; // DISABLED: Stepper used for base
const int PIN_SHOULDER   = 3;
const int PIN_ELBOW      = 4;
const int PIN_WRIST_P    = 5;
const int PIN_WRIST_R    = 6;
const int PIN_GRIPPER    = 7;

// --- Servo Objects ---
// Servo base; // DISABLED: Stepper used for base
Servo shoulder;
Servo elbow;
Servo wrist_pitch;
Servo wrist_roll;
Servo gripper;

void setup() {
  // 1. Initialize Serial (for debug)
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Wait a moment for power to stabilize
  delay(1000);
  Serial.println("=== A.R.I.A. Calibration Mode ===");
  Serial.println("Setting all servos to CENTER (90 deg)...");

  // 2. Attach and Center (CRITICAL SEQUENCE)
  // We write the position BEFORE attaching to prevent jitter on startup
  
  // Base
  // base.attach(PIN_BASE); // DISABLED: Stepper used for base
  // base.write(90);
  
  // Shoulder
  shoulder.attach(PIN_SHOULDER);
  shoulder.write(90);
  
  // Elbow
  elbow.attach(PIN_ELBOW);
  elbow.write(90);
  
  // Wrist Pitch
  wrist_pitch.attach(PIN_WRIST_P);
  wrist_pitch.write(90);
  
  // Wrist Roll
  wrist_roll.attach(PIN_WRIST_R);
  wrist_roll.write(90);
  
  // Gripper (Optional: 90 might be half open)
  gripper.attach(PIN_GRIPPER);
  gripper.write(90);
  
  Serial.println("DONE. Servos are holding position.");
  Serial.println("Now assemble the arm segments at 90 degree offsets.");
}

void loop() {
  // Blink LED to indicate active holding
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
  
  // Periodically reinforce the signal (not strictly necessary with Servo lib, but good safety)
  // base.write(90); // DISABLED: Stepper used for base
  shoulder.write(90);
  elbow.write(90);
  wrist_pitch.write(90);
  wrist_roll.write(90);
  gripper.write(90);
}
