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

// SERVOS
const int PIN_SHOULDER   = 3;
const int PIN_ELBOW      = 4;
const int PIN_WRIST_P    = 5;
const int PIN_WRIST_R    = 6;
const int PIN_GRIPPER    = 7;

// --- Config ---
// Stepper
const float MAX_SPEED      = 1000.0;
const float ACCELERATION   = 500.0;

// Objects
// Interface: Driver (1)
AccelStepper baseStepper(AccelStepper::DRIVER, PIN_STEPPER_STEP, PIN_STEPPER_DIR);

Servo shoulder;
Servo elbow;
Servo wrist_pitch;
Servo wrist_roll;
Servo gripper;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // --- Stepper Setup ---
  baseStepper.setMaxSpeed(MAX_SPEED);
  baseStepper.setAcceleration(ACCELERATION);
  // Optional: Set enable pin if used
  
  // --- Servo Setup ---
  shoulder.attach(PIN_SHOULDER);
  elbow.attach(PIN_ELBOW);
  wrist_pitch.attach(PIN_WRIST_P);
  wrist_roll.attach(PIN_WRIST_R);
  gripper.attach(PIN_GRIPPER);

  // Initial Positions (Home/Safe)
  shoulder.write(90);
  elbow.write(90);
  wrist_pitch.write(90);
  wrist_roll.write(90);
  gripper.write(90); 

  Serial.println("A.R.I.A. Hybrid Controller Ready.");
  Serial.println("Commands:");
  Serial.println("  B <steps>  : Move Base relative steps");
  Serial.println("  S <0-180>  : Shoulder Angle");
  Serial.println("  E <0-180>  : Elbow Angle");
  Serial.println("  P <0-180>  : Wrist Pitch Angle");
  Serial.println("  R <0-180>  : Wrist Roll Angle");
  Serial.println("  G <0-180>  : Gripper Angle");
}

void loop() {
  // 1. Run Stepper (MUST be called as often as possible)
  baseStepper.run();

  // 2. Parsers
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    int val = Serial.parseInt(); // Reads the number after command
    
    // Consume newline
    while(Serial.available() && Serial.peek() <= ' ') Serial.read();

    switch(toupper(cmd)) {
      case 'B': // Base (Relative Move)
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
      case 'P': // Pitch
        Serial.print("Wrist Pitch: "); Serial.println(val);
        wrist_pitch.write(val);
        break;
      case 'R': // Roll
        Serial.print("Wrist Roll: "); Serial.println(val);
        wrist_roll.write(val);
        break;
      case 'G': // Gripper
        Serial.print("Gripper: "); Serial.println(val);
        gripper.write(val);
        break;
      default:
        // Ignore unknown
        break;
    }
  }
}
