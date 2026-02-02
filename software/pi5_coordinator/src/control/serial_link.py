
import serial
import time
import logging
import glob
import sys

logger = logging.getLogger(__name__)

class SerialLink:
    """
    Handles communication with the Teensy 4.1 Arm Controller.
    Protocol: <J1,J2,J3,J4,J5,J6,TIME_MS>
    """
    
    def __init__(self, port=None, baud=115200):
        self.port = port if port else self._find_teensy()
        self.baud = baud
        self.ser = None
        self._connect()
        
    def _find_teensy(self):
        """Auto-detect Teensy port."""
        if sys.platform.startswith('linux'):
            # Look for ACM ports (Teensy usually /dev/ttyACM*)
            ports = glob.glob('/dev/ttyACM*')
            if ports:
                logger.info(f"Found Teeny/Arduino at {ports[0]}")
                return ports[0]
        return '/dev/ttyACM0' # Default fallback

    def _connect(self):
        """Establish serial connection."""
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2) # Wait for reset
            logger.info(f"Connected to Arm Controller on {self.port}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Teensy: {e}")
            self.ser = None

    def send_command(self, j1, j2, j3, j4, j5, j6, duration_ms=1000):
        """
        Send a move command to the arm.
        Angles in Degrees. J1 is Stepper (Degrees), J2-J6 Servos (0-180).
        """
        if not self.ser:
            logger.error("Serial not connected")
            return False
            
        # Format: <J1,J2,J3,J4,J5,J6,TIME>
        cmd_str = f"<{j1},{j2},{j3},{j4},{j5},{j6},{duration_ms}>"
        
        try:
            self.ser.write(cmd_str.encode('utf-8'))
            logger.info(f"Sent: {cmd_str}")
            return True
        except Exception as e:
            logger.error(f"Serial write failed: {e}")
            return False

    def close(self):
        if self.ser:
            self.ser.close()
