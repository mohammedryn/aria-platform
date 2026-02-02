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
    
    # Initial State (Matches Firmware Setup)
    # J1=0, J2..J6=90
    current_joints = [0.0, 90.0, 90.0, 90.0, 90.0, 90.0] 
    is_gripper_closed = False # Starts Open/Neutral
    
    try:
        while True:
            # Wait for user input
            choice = input("\nWaiting for command (1/q): ").strip()
            
            if choice == '1':
                # Exact Logic from Firmware main.cpp
                if is_gripper_closed:
                    print("Action: OPEN (+70, +50...)")
                    # Open (Add offsets)
                    current_joints[5] += 70 # J6
                    current_joints[4] += 50 # J5
                    current_joints[3] += 40 # J4
                    current_joints[2] += 30 # J3
                    current_joints[1] += 20 # J2
                    is_gripper_closed = False
                else:
                    print("Action: CLOSE (-70, -50...)")
                    # Close (Subtract offsets)
                    current_joints[5] -= 70
                    current_joints[4] -= 50
                    current_joints[3] -= 40
                    current_joints[2] -= 30
                    current_joints[1] -= 20
                    is_gripper_closed = True
                
                # Clamp to safe limits (0-180)
                for i in range(1, 6): # J2 to J6
                    current_joints[i] = max(0, min(180, current_joints[i]))
                
                # Send Command
                # J1 stays 0
                if arm.send_command(
                    current_joints[0], 
                    current_joints[1], 
                    current_joints[2], 
                    current_joints[3], 
                    current_joints[4], 
                    current_joints[5], 
                    1000
                ):
                    print("--> Command Sent. Listening for Teensy...")
                    # Listen for response for 1 second
                    start_wait = time.time()
                    while time.time() - start_wait < 1.0:
                        resp = arm.read_response()
                        if resp:
                            print(f"🤖 TEENSY SAID: {resp}")
                        time.sleep(0.01)
                        
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
