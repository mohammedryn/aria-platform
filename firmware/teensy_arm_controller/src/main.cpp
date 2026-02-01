#include <Arduino.h>
#include <Servo.h>
#include <AccelStepper.h>

// =========================================================================
// A.R.I.A. Hybrid Arm Controller
// =========================================================================
// Hardware: 
// - J1 (Base): NEMA 17 Stepper (Driver required, e.g., A4988/DRV8825)
// - J2-J5 + Gripper: Servos (PWM)
// =========================================================================

// --- Pin Definitions ---
// STEPPER (User to verify connection!)
const int PIN_STEPPER_STEP = 2; // Formerly Base Servo Pin
const int PIN_STEPPER_DIR  = 1; // [CHECK CONNECTION]

// SERVOS (Corrected Mappings)
const int PIN_SHOULDER   = 3;
const int PIN_ELBOW      = 4;
const int PIN_WRIST_ROLL = 5; // Inside Arm (Rotate)
const int PIN_WRIST_PITCH= 8; // MOVED FROM 6 TO 8 (Verify connection!)
const int PIN_GRIPPER    = 7; // RE-ENABLED (Was User Spec Pin 9, kept 7 for wiring consistency)

// --- Config ---
// Stepper
const float MAX_SPEED      = 1000.0;
const float ACCELERATION   = 500.0;

// Gripper Settings (User Constraints)
const int GRIPPER_SPEED_DELAY = 30; // Higher = Slower/Smoother

// Objects
// Interface: Driver (1)
AccelStepper baseStepper(AccelStepper::DRIVER, PIN_STEPPER_STEP, PIN_STEPPER_DIR);

Servo shoulder;
Servo elbow;
Servo wrist_roll;
Servo wrist_pitch;
Servo gripper; 

void moveToHome() {
  Serial.println("Moving to ALERT Stance...");
  // A "Ready" stance, better than flat 90s
  shoulder.write(90);    // Slight angle up
  elbow.write(90);       // Bent forward
  wrist_roll.write(90);   // Flat
  wrist_pitch.write(90);  // Level
}

void triggerGripperCycle() {
  Serial.println("Starting Smooth Gripper Cycle...");
  
  int startPos = gripper.read();
  
  // --- STEP 1: MOVE DOWN BY 60 ---
  int target1 = startPos - 60;
  if (target1 < 0) target1 = 0; // Safety clamp

  // Move smooth (blocking)
  if (startPos > target1) {
      for (int pos = startPos; pos >= target1; pos--) {
        gripper.write(pos);
        delay(GRIPPER_SPEED_DELAY); 
      }
  } else {
      for (int pos = startPos; pos <= target1; pos++) {
        gripper.write(pos);
        delay(GRIPPER_SPEED_DELAY); 
      }
  }
  
  delay(500); // Wait half a second at the bottom

  // --- STEP 2: MOVE UP BY 50 ---
  int target2 = target1 + 50;
  if (target2 > 180) target2 = 180; // Safety clamp

  // Move smooth (blocking)
  if (target1 < target2) {
      for (int pos = target1; pos <= target2; pos++) {
        gripper.write(pos);
        delay(GRIPPER_SPEED_DELAY);
      }
  } else {
      for (int pos = target1; pos >= target2; pos--) {
        gripper.write(pos);
        delay(GRIPPER_SPEED_DELAY);
      }
  }

  Serial.print("Cycle Complete. Final Angle: ");
  Serial.println(target2);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // --- Stepper Setup ---
  baseStepper.setMaxSpeed(MAX_SPEED);
  baseStepper.setAcceleration(ACCELERATION);
  
  // --- Servo Setup ---
  shoulder.attach(PIN_SHOULDER);
  elbow.attach(PIN_ELBOW);
  wrist_roll.attach(PIN_WRIST_ROLL);
  wrist_pitch.attach(PIN_WRIST_PITCH, 500, 2500); // Added range for stability
  gripper.attach(PIN_GRIPPER);

  // Initial Positions (Home/Safe)
  moveToHome();
  
  // Gripper Init (User Spec: Start high enough to subtract 60)
  gripper.write(100); 

  Serial.println("A.R.I.A. Hybrid Controller Ready.");
  Serial.println("Format: shoulder,elbow,wrist_roll,wrist_pitch,gripper");
  Serial.println("  (Use '1' as 5th value to trigger smooth cycle)");
  Serial.println("  Examples: 180,80,70,80,1  or  90,90,90,90,90");
  Serial.println("Commands: 1 (Cycle), H (Home), csv format");
}

void loop() {
  // 1. Run Stepper (MUST be called as often as possible)
  baseStepper.run();

  // 2. Parsers
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim(); // Remove whitespace/newlines

    if (input.length() == 0) return;

    // A. Specific Gripper Command
    if (input == "1") {
      triggerGripperCycle();
      return;
    }

    // B. 5-Axis CSV Mode (Look for commas)
    if (input.indexOf(',') != -1) {
      // Manual parsing of string "180,80,70,80,1"
      int s, e, r, p, g;
      int firstComma = input.indexOf(',');
      int secondComma = input.indexOf(',', firstComma + 1);
      int thirdComma = input.indexOf(',', secondComma + 1);
      int fourthComma = input.indexOf(',', thirdComma + 1);
      
      if(firstComma > 0 && secondComma > 0 && thirdComma > 0 && fourthComma > 0) {
         s = input.substring(0, firstComma).toInt();
         e = input.substring(firstComma + 1, secondComma).toInt();
         r = input.substring(secondComma + 1, thirdComma).toInt();
         p = input.substring(thirdComma + 1, fourthComma).toInt();
         g = input.substring(fourthComma + 1).toInt();

         Serial.print(" -> Angles:[S:"); Serial.print(s);
         Serial.print(" E:"); Serial.print(e);
         Serial.print(" R:"); Serial.print(r);
         Serial.print(" P:"); Serial.print(p);
         Serial.print(" G:"); Serial.print(g);
         Serial.println("]");

         shoulder.write(s);
         elbow.write(e);
         wrist_roll.write(r);
         wrist_pitch.write(p);
         
         // Gripper Logic: 1 = Cycle, else = Absolute
         if (g == 1) {
           triggerGripperCycle();
         } else {
           gripper.write(g);
         }
      } else {
        Serial.println("Error: Use format: shoulder,elbow,wrist_roll,wrist_pitch,gripper");
      }
      return;
    }

    // C. Legacy Command Mode (H, B 100, S 90)
    char cmd = toupper(input.charAt(0));
    int val = 0;
    if (input.length() > 1) {
      val = input.substring(1).toInt();
    }

    switch(cmd) {
      case 'H': // Home
        moveToHome();
        break;
      case 'B': // Base
        Serial.print("Base Move: "); Serial.println(val);
        baseStepper.move(val); 
        break;
      case 'S': // Shoulder
        Serial.print("Shoulder: "); Serial.println(val);
        shoulder.write(val);
        break;
      case 'E': // Elbow
        Serial.print("Elbow: "); Serial.println(val);
        elbow.write(val);
        break;
      case 'R': // Roll
        Serial.print("Wrist Roll: "); Serial.println(val);
        wrist_roll.write(val);
        break;
      case 'P': // Pitch
        Serial.print("Wrist Pitch: "); Serial.println(val);
        wrist_pitch.write(val);
        break;
      case 'G': // Gripper (Manual)
        Serial.print("Gripper: "); Serial.println(val);
        gripper.write(val);
        break;
      default: 
        // Unknown
        break;
    }
  }
}
