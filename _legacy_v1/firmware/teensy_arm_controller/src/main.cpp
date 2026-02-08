#include <AccelStepper.h>
#include <Arduino.h>
#include <Servo.h>

/**
 * A.R.I.A. Arm Controller - 3-DOF "Pointer" Edition
 *
 * Hardware Mapping:
 * J1 (Base): NEMA 17 Stepper via DRV8825/A4988
 * J2 (Shoulder): Futaba S3003 PWM Servo
 * J3 (Elbow): Futaba S3003 PWM Servo
 *
 * Protocol: <J1_STEPS, J2_DEG, J3_DEG, TIME_MS>
 */

// --- PIN DEFINITIONS ---
#define STEP_PIN 2
#define DIR_PIN 3
#define SERVO_J2_PIN 4
#define SERVO_J3_PIN 5

// --- HARDWARE OBJECTS ---
AccelStepper stepper(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);
Servo j2;
Servo j3;

// --- STATE ---
long targetJ1 = 0;
int targetJ2 = 90;
int targetJ3 = 90;

// Serial Parsing
const byte numChars = 64;
char receivedChars[numChars];
boolean newData = false;

// --- PROTOTYPES ---
void recvWithStartEndMarkers();
void parseData();
void moveHardware();

void setup() {
  Serial.begin(115200);

  // Stepper setup
  stepper.setMaxSpeed(1000);
  stepper.setAcceleration(500);

  // Servo setup
  j2.attach(SERVO_J2_PIN);
  j3.attach(SERVO_J3_PIN);

  // Home positions
  j2.write(90);
  j3.write(90);

  Serial.println("A.R.I.A. 3-DOF Pointer Arm Online");
}

void loop() {
  recvWithStartEndMarkers();
  if (newData) {
    parseData();
    moveHardware();
    newData = false;
  }

  stepper.run();
}

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
        receivedChars[ndx] = '\0';
    } else if (rc == startMarker) {
      recvInProgress = true;
    }
        }
    }
void parseData() {
    // Implementation logic here
}

void moveHardware() {
  targetJ1 = atol(strtokIndx);

  strtokIndx = strtok(NULL, ",");
  targetJ2 = atoi(strtokIndx);

  strtokIndx = strtok(NULL, ",");
  targetJ3 = atoi(strtokIndx);

  // Skip the rest if present
  Serial.print("Target: J1=");
  Serial.print(targetJ1);
  Serial.print(" J2=");
  Serial.print(targetJ2);
  Serial.print(" J3=");
  Serial.println(targetJ3);
}

void moveHardware() {
  stepper.moveTo(targetJ1);
  j2.write(targetJ2);
  j3.write(targetJ3);
}
