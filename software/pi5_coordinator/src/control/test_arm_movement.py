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
    
    print("✅ Connected!")
    print("Commands:")
    print("  '1' + Enter: Toggle Position (Home <-> Active)")
    print("  'q' + Enter: Quit")
    
    # State tracking
    is_active_pose = False
    
    try:
        while True:
            # Wait for user input
            choice = input("\nWaiting for command (1/q): ").strip()
            
            if choice == '1':
                if is_active_pose:
                    # GO HOME (All 90, Stepper 0)
                    print("⬇️  Moving to HOME...")
                    # <0, 90, 90, 90, 90, 90, 1000ms>
                    if arm.send_command(0, 90, 90, 90, 90, 90, 1000):
                        is_active_pose = False
                else:
                    # GO ACTIVE (Reach Out / Gripper Close)
                    print("⬆️  Moving to ACTION...")
                    # Example Action Pose: Reach forward + Grip
                    # J1=0 (Face forward)
                    # J2=60 (Shoulder Forward)
                    # J3=60 (Elbow Up)
                    # J4=90 (Roll Flat)
                    # J5=0  (Pitch Down)
                    # J6=180 (Grip Closed)
                    if arm.send_command(0, 60, 60, 90, 0, 180, 1000):
                        is_active_pose = True
                        
            elif choice.lower() == 'q':
                print("👋 Quitting...")
                break
            else:
                print("⚠️  Invalid input. Press '1' to toggle.")

    except KeyboardInterrupt:
        print("\n👋 Interrupted")
    finally:
        arm.close()
        print("🔌 Link Closed")

if __name__ == "__main__":
    main()
