#!/bin/bash
# Flash ESP32-S3-BOX-3 Voice Interface Firmware
# Requires: PlatformIO CLI installed

set -e

echo "=================================="
echo "Flashing ESP32-S3-BOX-3"
echo "=================================="

cd "$(dirname "$0")/../firmware/esp32_voice_interface"

# Check if PlatformIO is installed
if ! command -v pio &> /dev/null; then
    echo "❌ PlatformIO not found!"
    echo "Install with: pip3 install platformio"
    exit 1
fi

# Check if ESP32 is connected
if ! ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null; then
    echo "⚠️  No ESP32 detected"
    echo "Please connect ESP32-S3-BOX-3 via USB"
    read -p "Press Enter when connected..."
fi

echo ""
echo "Building firmware..."
pio run

echo ""
echo "Uploading to ESP32..."
pio run -t upload

echo ""
echo "✅ Firmware flashed successfully!"
echo "Opening serial monitor (Ctrl+C to exit)..."
echo ""

pio device monitor
