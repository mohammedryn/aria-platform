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
#define SERVO_J5_PIN 8 // Pin 8 (Fixed: Pin 6 conflicts with AccelStepper)
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
bool isGripperClosed = false; // Track toggle state

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
  // 1. SIMPLE PARSER (Toggle Mode)
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == '1') {
       // Toggle Logic
       float currentAngleJ6 = joints[5].current;
       float currentAngleJ5 = joints[4].current;
       float currentAngleJ4 = joints[3].current;
       float currentAngleJ3 = joints[2].current;
       float currentAngleJ2 = joints[1].current;
       float newTargetJ6;
       float newTargetJ5;
       float newTargetJ4;
       float newTargetJ3;
       float newTargetJ2;

       if (isGripperClosed) {
           Serial.println("Action: Open, Up, Right, Elbow Up, Shoulder Up");
           newTargetJ6 = currentAngleJ6 + 70;
           newTargetJ5 = currentAngleJ5 + 50; 
           newTargetJ4 = currentAngleJ4 + 40;
           newTargetJ3 = currentAngleJ3 + 30;
           newTargetJ2 = currentAngleJ2 + 20;
           isGripperClosed = false;
       } else {
           Serial.println("Action: Close, Down, Left, Elbow Down, Shoulder Down");
           newTargetJ6 = currentAngleJ6 - 70;
           newTargetJ5 = currentAngleJ5 - 50;
           newTargetJ4 = currentAngleJ4 - 40;
           newTargetJ3 = currentAngleJ3 - 30;
           newTargetJ2 = currentAngleJ2 - 20;
           isGripperClosed = true;
       }

       // Clamp J6
       if (newTargetJ6 > 180) newTargetJ6 = 180;
       if (newTargetJ6 < 0) newTargetJ6 = 0;
       
       // Clamp J5
       if (newTargetJ5 > 180) newTargetJ5 = 180;
       if (newTargetJ5 < 0) newTargetJ5 = 0;

       // Clamp J4
       if (newTargetJ4 > 180) newTargetJ4 = 180;
       if (newTargetJ4 < 0) newTargetJ4 = 0;

       // Clamp J3
       if (newTargetJ3 > 180) newTargetJ3 = 180;
       if (newTargetJ3 < 0) newTargetJ3 = 0;

       // Clamp J2
       if (newTargetJ2 > 180) newTargetJ2 = 180;
       if (newTargetJ2 < 0) newTargetJ2 = 0;

       // Setup S-Curve Move
       // Update Start Positions to Current
       for (int i = 0; i < 6; i++) joints[i].start = joints[i].current;
       
       // Set specific targets
       joints[5].target = newTargetJ6;
       joints[4].target = newTargetJ5;
       joints[3].target = newTargetJ4;
       joints[2].target = newTargetJ3;
       joints[1].target = newTargetJ2;

       moveDuration = 1000; // 1.0 second smooth move
       moveStartTime = millis();
       isMoving = true;
    }
    // Clear buffer (Only if '1' was found, otherwise let parser handle it?)
    // Actually, we should allow both.
    // If it wasn't '1', we don't consume it here.
    // But Serial.read() above consumed one char.
    // Let's refine: 
    // If '1', do toggle.
    // Else, pass execution to standard parser? 
    // The standard parser looks for '<' start marker. '1' is not '<'.
    // So separate logic is fine.
  }

  // 1b. Standard Protocol Parser (<...>)
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
      Serial.print("DONE. Gripper at: ");
      Serial.println(joints[5].current);
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
