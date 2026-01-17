# Hardware Assembly Notes

## 5-DOF Robotic Arm

### Servo Configuration

| Joint | Servo Model | Torque | Range | PWM Min | PWM Max |
|-------|-------------|--------|-------|---------|---------|
| Base (J1) | MG996R | 11 kg·cm | 0-180° | 500μs | 2500μs |
| Shoulder (J2) | Futaba S3003 | 3.2 kg·cm | -45 to 135° | 600μs | 2400μs |
| Elbow (J3) | Futaba S3003 | 3.2 kg·cm | -90 to 90° | 600μs | 2400μs |
| Wrist Pitch (J4) | MG90S | 1.8 kg·cm | -90 to 90° | 700μs | 2300μs |
| Wrist Roll (J5) | MG90S | 1.8 kg·cm | -90 to 90° | 700μs | 2300μs |

### Teensy 4.1 Pin Connections

```
Servo Pin Mapping:
- J1 (Base):     Pin 2
- J2 (Shoulder): Pin 3
- J3 (Elbow):    Pin 4
- J4 (Wrist P):  Pin 5
- J5 (Wrist R):  Pin 6

Power:
- VCC: External 6V/5A power supply
- GND: Common ground with Teensy
- Signal: Teensy GPIO pins (3.3V logic compatible)
```

### Assembly Steps

1. **Mount Base Servo**: Secure MG996R to base platform
2. **Attach Shoulder Link**: Connect 150mm arm segment
3. **Install Elbow Servo**: Mount S3003 at joint
4. **Add Forearm**: Attach 120mm segment
5. **Wrist Assembly**: Install both MG90S servos
6. **Cable Management**: Route servo wires cleanly
7. **Power Distribution**: Connect all servos to 6V supply

---

## Acebott Spider

### Specifications

- **Servos**: 18× digital servos (3 per leg)
- **Locomotion**: Hexapod tripod gait
- **Speed**: ~10 cm/s
- **Battery**: 7.4V LiPo (capacity TBD)

### Modifications for A.R.I.A.

1. **Camera Mount**: Attach Pi HQ Camera to top platform
   - Use 3D printed bracket (STL in `hardware/3d_models/`)
   - Ensure camera has clear forward view
   - Secure cables to prevent tangling

2. **LIDAR Mount**: Mount SLAMTEC C1 LIDAR
   - Position at center of top platform
   - Height: Above camera for 360° scan
   - Power from Pi 5 USB

3. **Communication**: Connect to Pi 5
   - Option A: WiFi (if spider MCU supports)
   - Option B: Serial cable (if tethered testing)

---

## Raspberry Pi 5 Setup

### Connections

```
Pi 5 GPIO/Ports:
- USB 3.0 Port 1: Teensy 4.1
- USB 3.0 Port 2: SLAMTEC LIDAR
- CSI Camera Port: Pi HQ Camera
- Ethernet: Network connection
- Power: USB-C PD, 5V/5A

ESP32-S3-BOX-3:
- WiFi connection to same network as Pi
- MQTT communication over WiFi
```

### Power Budget

| Component | Voltage | Current | Power |
|-----------|---------|---------|-------|
| Raspberry Pi 5 | 5V | 5A | 25W |
| Arm Servos (6V) | 6V | 5A peak | 30W |
| Spider | 7.4V | Internal battery | — |
| ESP32 | 5V | 0.5A | 2.5W |
| LIDAR | 5V | 0.4A | 2W |
| **Total Max** | — | — | **~60W** |

**Recommended**: 
- Pi: Dedicated 5V/5A USB-C PD supply
- Arm: Dedicated 6V/5A bench supply
- Spider: Onboard battery
- ESP32: USB power or battery

---

## Safety Checklist

- [ ] All servo horn screws tightened
- [ ] Cable strain relief in place
- [ ] Power supplies rated correctly
- [ ] Emergency stop accessible
- [ ] Workspace clear of obstacles
- [ ] Joint limits configured in firmware

---

## Troubleshooting

**Servo jitter**: Check power supply voltage/current, add capacitors
**Communication errors**: Verify baud rates, check cable connections
**LIDAR not detected**: Check USB connection, verify udev rules
