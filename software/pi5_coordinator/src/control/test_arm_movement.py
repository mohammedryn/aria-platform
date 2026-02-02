
import sys
import os
import time

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.control.serial_link import SerialLink

def main():
    print("🤖 A.R.I.A. Arm Movement Test")
    print("Connecting to Teensy...")
    
    arm = SerialLink()
    
    if not arm.ser:
        print("❌ Could not connect to Teensy. Check USB cable.")
        return

    print("✅ Connected!")
    print("\ncommands:")
    print("  home      - Move to Home (0,90,90,90,90,90)")
    print("  up        - Look Up")
    print("  grab      - Close Gripper (J6=180)")
    print("  open      - Open Gripper (J6=0)")
    print("  q         - Quit")
    
    try:
        while True:
            cmd = input("\nEnter Command > ").strip().lower()
            
            if cmd == 'q':
                break
            
            elif cmd == 'home':
                arm.send_command(0, 90, 90, 90, 90, 90, 2000)
                
            elif cmd == 'up':
                # Shoulder up, Elbow bent
                arm.send_command(0, 110, 110, 90, 90, 90, 1500)
                
            elif cmd == 'grab':
                # Keep current pos, just logic for gripper? 
                # For test, we just send a known pose with closed gripper
                print("Moving to Home + CLOSED")
                arm.send_command(0, 90, 90, 90, 90, 180, 1000)

            elif cmd == 'open':
                print("Moving to Home + OPEN")
                arm.send_command(0, 90, 90, 90, 90, 0, 1000)
                
            else:
                print("Unknown command. Try 'home', 'grab', 'open'")
                
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        arm.close()

if __name__ == "__main__":
    main()
