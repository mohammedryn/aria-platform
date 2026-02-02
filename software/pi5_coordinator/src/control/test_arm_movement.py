#!/usr/bin/env python3
"""
Test Arm Movement via Serial Link
"""
import sys
import os
import time

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from src.control.serial_link import SerialLink

def main():
    print("🤖 Initializing Arm Link...")
    
    # Connect
    arm = SerialLink(port='/dev/ttyACM0')
    if not arm.connect():
        print("❌ Failed to connect to Teensy (Check USB or Permission)")
        return
    
    print("✅ Connected! Starting Dance in 3 seconds...")
    time.sleep(3)
    
    # Format: send_command(j1, j2, j3, j4, j5, j6, time)
    
    # 1. HOME POSITION
    print("📍 Moving to HOME")
    arm.send_command(0, 90, 90, 90, 90, 90, 2000)
    time.sleep(2.5) # Wait for move + buffer
    
    # 2. LOOKOUT (Shoulder Up, Elbow 90)
    print("📍 Moving to LOOKOUT")
    arm.send_command(45, 120, 90, 90, 45, 90, 1500)
    time.sleep(2.0)
    
    # 3. EXTEND (Reach out)
    print("📍 Moving to EXTEND")
    arm.send_command(-45, 60, 60, 90, 0, 90, 1500)
    time.sleep(2.0)
    
    # 4. HOME 
    print("📍 Return to HOME")
    arm.send_command(0, 90, 90, 90, 90, 90, 2000)
    
    arm.close()
    print("✨ Dance Complete!")

if __name__ == "__main__":
    main()
