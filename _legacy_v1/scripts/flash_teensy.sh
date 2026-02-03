#!/bin/bash
# Flash Teensy 4.1 Arm Controller Firmware
# Requires: PlatformIO CLI installed

set -e

echo "=================================="
echo "Flashing Teensy 4.1 Arm Controller"
echo "=================================="

cd "$(dirname "$0")/../firmware/teensy_arm_controller"

# Check if PlatformIO is installed
if ! command -v pio &> /dev/null; then
    echo "❌ PlatformIO not found!"
    echo "Install with: pip3 install platformio"
    exit 1
fi

# Check if Teensy is connected
if ! ls /dev/ttyACM* 2>/dev/null; then
    echo "⚠️  No Teensy detected on /dev/ttyACM*"
    echo "Please connect Teensy 4.1 via USB"
    read -p "Press Enter when connected..."
fi

echo ""
echo "Building firmware..."
pio run

echo ""
echo "Uploading to Teensy..."
pio run -t upload

echo ""
echo "✅ Firmware flashed successfully!"
echo "Opening serial monitor (Ctrl+C to exit)..."
echo ""

pio device monitor
