#include <AccelStepper.h>
#include <Arduino.h>
#include <Servo.h>


// -------------------------------------------------------------------------
// 🤖 RAOJ-V2 ARM CONTROLLER (S-CURVE EDITION)
// -------------------------------------------------------------------------

// --- PIN DEFINITIONS ---
#define STEPPER_DIR_PIN 1
#define STEPPER_STEP_PIN 2

#define SERVO_J2_PIN 3
#define SERVO_J3_PIN 4
#define SERVO_J4_PIN 5
#define SERVO_J5_PIN 6
#define SERVO_J6_PIN 7

// --- HARDWARE OBJECTS ---
Servo s2, s3, s4, s5, s6;
AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);

// --- MOTION CONSTANTS ---
// Stepper Calibration: Adjust this value based on microstepping
// Assuming 1600 steps/rev (1/8 microstep) or similar.
// User will need to tune this "Steps Per Degree" value.
const float STEPS_PER_DEGREE = 8.88; // Placeholder: 200 * 16 / 360

// --- STATE VARIABLES ---
struct JointState {
  float current; // Current angle (degrees)
  float start;   // Start angle for move
  float target;  // Target angle
};

JointState joints[6]; // Index 0=J1(Stepper), 1=J2 ... 5=J6

unsigned long moveStartTime = 0;
unsigned long moveDuration = 1000; // ms
bool isMoving = false;

// --- S-CURVE MATH (The Magic) ---
float smoothstep(float t) {
  // Input t: 0.0 to 1.0
  // Output: 0.0 to 1.0 with Ease-In / Ease-Out
  return t * t * (3.0f - 2.0f * t);
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);

  // 1. Setup Stepper
  stepper.setMaxSpeed(5000); // High limit, we control actual speed via loop
  stepper.setAcceleration(
      5000); // High accel, we ensure smoothness via S-Curve path

  // 2. Setup Servos
  s2.attach(SERVO_J2_PIN);
  s3.attach(SERVO_J3_PIN);
  s4.attach(SERVO_J4_PIN);
  s5.attach(SERVO_J5_PIN);
  s6.attach(SERVO_J6_PIN);

  // 3. Initialize Positions (Center 90)
  for (int i = 0; i < 6; i++) {
    joints[i].current = 90.0;
    joints[i].target = 90.0;
    joints[i].start = 90.0;
  }
  joints[0].current = 0.0; // Stepper starts at 0

  // Apply specific initial positions
  s2.write(90);
  s3.write(90);
  s4.write(90);
  s5.write(90);
  s6.write(90);

  Serial.println("A.R.I.A. Arm Controller Online");
  Serial.println("Protocol: <J1,J2,J3,J4,J5,J6,TIME_MS>");
  Serial.println("Example: <45,90,45,90,90,0,2000>");
}

// --- PARSING HELPERS ---
const byte numChars = 64;
char receivedChars[numChars];
boolean newData = false;

void recvWithStartEndMarkers() {
  static boolean recvInProgress = false;
  static byte ndx = 0;
  char startMarker = '<';
  char endMarker = '>';
  char rc;

  while (Serial.available() > 0 && newData == false) {
    rc = Serial.read();

    if (recvInProgress == true) {
      if (rc != endMarker) {
        receivedChars[ndx] = rc;
        ndx++;
        if (ndx >= numChars)
          ndx = numChars - 1;
      } else {
        receivedChars[ndx] = '\0'; // terminate string
        recvInProgress = false;
        newData = true;
      }
    } else if (rc == startMarker) {
      recvInProgress = true;
      ndx = 0;
    }
  }
}

void parseData() {
  char *strtokIndx;

  // Format: J1,J2,J3,J4,J5,J6,Time

  // J1 (Stepper, can be negative)
  strtokIndx = strtok(receivedChars, ",");
  float t1 = atof(strtokIndx);

  // J2-J6 (Servos)
  strtokIndx = strtok(NULL, ",");
  float t2 = atof(strtokIndx);
  strtokIndx = strtok(NULL, ",");
  float t3 = atof(strtokIndx);
  strtokIndx = strtok(NULL, ",");
  float t4 = atof(strtokIndx);
  strtokIndx = strtok(NULL, ",");
  float t5 = atof(strtokIndx);
  strtokIndx = strtok(NULL, ",");
  float t6 = atof(strtokIndx);

  // Duration
  strtokIndx = strtok(NULL, ",");
  float timeVal = atof(strtokIndx);

  // --- APPLY TO STATE ---
  // Update Start Positions to current Actual positions
  for (int i = 0; i < 6; i++)
    joints[i].start = joints[i].current;

  // Set Targets
  joints[0].target = t1;
  joints[1].target = t2;
  joints[2].target = t3;
  joints[3].target = t4;
  joints[4].target = t5;
  joints[5].target = t6;

  // Set Time (Min 500ms safety)
  moveDuration = (timeVal < 500) ? 500 : (unsigned long)timeVal;

  moveStartTime = millis();
  isMoving = true;

  Serial.print("MOVING TO: ");
  Serial.print(t1);
  Serial.print(" ");
  Serial.print(t2);
  Serial.print(" ");
  Serial.print(timeVal);
  Serial.println("ms");
}

// --- MAIN LOOP ---
void loop() {
  // 1. Read Serial
  recvWithStartEndMarkers();
  if (newData == true) {
    parseData();
    newData = false;
  }

  // 2. Motion Engine
  if (isMoving) {
    unsigned long now = millis();
    float elapsed = (now - moveStartTime) / (float)moveDuration;

    if (elapsed >= 1.0f) {
      // FINISHED
      elapsed = 1.0f;
      isMoving = false;
      Serial.println("DONE");
    }

    // Apply S-Curve
    float k = smoothstep(elapsed);

    // Update All Joints
    for (int i = 0; i < 6; i++) {
      // Interpolate: Current = Start + (Dist * k)
      float dist = joints[i].target - joints[i].start;
      joints[i].current = joints[i].start + (dist * k);
    }

    // --- WRITE TO HARDWARE ---

    // J1: Stepper (Degrees -> Steps)
    long stepperTarget = (long)(joints[0].current * STEPS_PER_DEGREE);
    stepper.moveTo(stepperTarget);
    stepper.run(); // Call as often as possible!

    // J2-J6: Servos (Degrees)
    s2.write((int)joints[1].current);
    s3.write((int)joints[2].current);
    s4.write((int)joints[3].current);
    s5.write((int)joints[4].current);
    s6.write((int)joints[5].current);
  } else {
    // Even when not "profiling", keep stepper inputs active to hold position
    stepper.run();
  }
}
