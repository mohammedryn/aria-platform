# Setup Guide - Project A.R.I.A.

## Prerequisites

### Hardware Required
- Raspberry Pi 5 (8GB recommended)
- Teensy 4.1
- ESP32-S3-BOX-3
- 5-DOF robotic arm with servos
- Acebott Bionic Spider
- Pi HQ Camera + lens
- SLAMTEC C1 LIDAR
- Power supplies (see hardware/assembly_notes.md)

### Software Required
- Ubuntu 22.04 LTS (on Pi)
- Python 3.10+
- PlatformIO CLI (for firmware)
- Google Gemini API key

---

## Part 1: Development Machine Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/aria-swarm.git
cd aria-swarm
```

### 2. Install PlatformIO (for firmware development)
```bash
pip3 install platformio
```

### 3. Install Python Dependencies
```bash
cd software/pi5_coordinator
pip3 install -r requirements.txt
```

---

## Part 2: Raspberry Pi 5 Setup

### 1. Install Ubuntu 22.04
- Download from: https://ubuntu.com/download/raspberry-pi
- Flash to SD card with Raspberry Pi Imager
- Boot and complete initial setup

### 2. Run Automated Setup
```bash
git clone https://github.com/your-username/aria-swarm.git
cd aria-swarm
./scripts/setup_pi.sh
```

This will install:
- ROS2 Humble
- Python dependencies
- MQTT broker
- System libraries

### 3. Configure Gemini API
```bash
export GEMINI_API_KEY="your-key-here"
echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

Get your key: https://makersuite.google.com/app/apikey

### 4. Reboot
```bash
sudo reboot
```

---

## Part 3: Firmware Flashing

### Teensy 4.1 (Arm Controller)
```bash
cd aria-swarm
./scripts/flash_teensy.sh
```

### ESP32-S3-BOX-3 (Voice Interface)
```bash
cd aria-swarm
./scripts/flash_esp32.sh
```

**Note**: You may need to hold BOOT button on ESP32 while flashing.

---

## Part 4: Hardware Connections

See `hardware/assembly_notes.md` for detailed wiring.

**Quick checklist**:
1. Connect Teensy to Pi via USB 3.0
2. Connect Pi HQ Camera to CSI port
3. Connect LIDAR to Pi via USB
4. Power on ESP32 (verify WiFi connection)
5. Connect arm servos to external 6V power
6. Verify spider is charged

---

## Part 5: Calibration

### Camera Calibration
```bash
cd software/pi5_coordinator
python3 src/calibrate_camera.py
```

Follow on-screen instructions to capture checkerboard images.

### Hand-Eye Calibration
```bash
python3 src/calibrate_hand_eye.py
```

Place ArUco marker at known position, follow prompts.

### Servo Calibration
Open serial monitor to Teensy:
```
pio device monitor
```

Send calibration commands to adjust joint limits.

---

## Part 6: Testing

### Test 1: Arm Movement
```bash
cd software/pi5_coordinator
python3 src/test_arm.py
```

Should move to home position smoothly.

### Test 2: Camera Capture
```bash
python3 src/test_camera.py
```

Check image quality in `/tmp/test_capture.jpg`

### Test 3: Gemini API
```bash
python3 src/test_gemini.py
```

Should return scene analysis JSON.

### Test 4: Voice Interface
Say wake word to ESP32, verify command appears in MQTT:
```bash
mosquitto_sub -t aria/voice/command -v
```

---

## Part 7: Running the System

### Start Coordinator
```bash
cd software/pi5_coordinator
python3 src/aria_main.py
```

### System should now be ready!

Try voice command: **"ARIA, hand me the blue marker"**

---

## Troubleshooting

### Pi can't see Teensy
- Check USB connection
- Verify udev rules: `ls -l /dev/ttyACM*`
- Re-run setup script

### Gemini API timeout
- Check internet connection
- Verify API key: `echo $GEMINI_API_KEY`
- Check quota in Google Cloud Console

### Servos not moving
- Verify 6V power supply connected
- Check servo connections in firmware
- Test individual servo with serial commands

### ESP32 not connecting
- Verify WiFi credentials in firmware
- Check MQTT broker running: `sudo systemctl status mosquitto`
- Check ESP32 serial output for errors

---

## Next Steps

- Read calibration guide: `docs/calibration.md`
- Review API reference: `docs/api_reference.md`
- Run demo scenarios
- Customize prompts in `config/gemini_prompts.yaml`
