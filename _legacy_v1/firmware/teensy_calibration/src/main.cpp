#include <Arduino.h>

void setup() {
    // Teensy 4.1 uses USB Serial; baud rate is ignored but kept for compatibility
    Serial.begin(115200);
    
    // Wait up to 4 seconds for Serial Monitor to open
    while (!Serial && millis() < 4000);
    
    pinMode(LED_BUILTIN, OUTPUT);
    Serial.println("Teensy 4.1 Initialized Successfully.");
}

void loop() {
    unsigned long currentMillis = millis();

    // Non-blocking LED Blink Logic (500ms ON / 500ms OFF)
    static uint32_t lastBlink = 0;
    static bool ledState = LOW;
    if (currentMillis - lastBlink >= 500) {
        lastBlink = currentMillis;
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState);
    }

    // Non-blocking Uptime Report Logic (Every 5 seconds)
    static uint32_t lastReport = 0;
    if (currentMillis - lastReport >= 5000) {
        lastReport = currentMillis;
        // Teensy 4.1 supports printf natively for easy formatting
        // tempmon_get_temp() returns the internal die temperature as a float
        Serial.printf("System Uptime: %lu seconds | CPU Temp: %.2f°C\n", 
                      currentMillis / 1000, 
                      tempmon_get_temp());
    }
}