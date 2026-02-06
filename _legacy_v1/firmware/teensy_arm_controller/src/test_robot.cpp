#include <Arduino.h>
#include <Servo.h>

// Pin Definitions
#define LED_PIN 13
#define SERVO_PIN 9

Servo myServo;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  myServo.attach(SERVO_PIN);
}

void loop() {
  // Valid move
  myServo.write(90);
  delay(1000);
  
  delay(1000);
  
  // ERROR: Angle 200 is out of bounds (0-180)
  // The validator should catch this! Correcting to 180.
  myServo.write(180); 
}