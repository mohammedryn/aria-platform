import serial
import time
import logging

logger = logging.getLogger(__name__)

class SerialLink:
    """
    Handles communication with the Teensy 4.1 Arm Controller.
    Protocol: <J1,J2,J3,J4,J5,J6,TIME_MS>
    Example: <0,90,90,90,90,90,1000>
    """
    
    def __init__(self, port='/dev/ttyACM0', baud=115200):
        self.port = port
        self.baud = baud
        self.ser = None
        self.connected = False
        
    def connect(self):
        """Establish serial connection."""
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2) # Wait for reset
            self.connected = True
            logger.info(f"Connected to Teensy on {self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Teensy: {e}")
            self.connected = False
            return False

    def send_command(self, j1, j2, j3, j4, j5, j6, duration_ms=1000):
        """
        Send a move command to the arm.
        
        Args:
            j1 (float): Stepper angle (Base)
            j2-j6 (float): Servo angles (0-180)
            duration_ms (int): S-Curve movement duration
        """
        if not self.connected:
            logger.error("Not connected to arm!")
            return False
            
        # Format: <45.0,90.0,45.0,90.0,90.0,0.0,2000>
        cmd = f"<{j1},{j2},{j3},{j4},{j5},{j6},{duration_ms}>\n"
        
        try:
            self.ser.write(cmd.encode('utf-8'))
            logger.debug(f"Sent: {cmd.strip()}")
            return True
        except Exception as e:
            logger.error(f"Failed to send command: {e}")
            return False

    def read_response(self):
        """Read line from Teensy."""
        if self.connected and self.ser.in_waiting:
            return self.ser.readline().decode('utf-8').strip()
        return None

    def close(self):
        if self.ser:
            self.ser.close()
