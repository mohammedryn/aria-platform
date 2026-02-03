"""
Universal Camera Interface for A.R.I.A.
Supports: Laptop webcam (OpenCV), Pi HQ Camera (picamera2)
"""

import cv2
import numpy as np
from typing import Optional, Tuple
import platform
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CameraInterface:
    """Universal camera interface that works on laptop and Pi."""
    
    def __init__(self, source: str = "auto", resolution: Tuple[int, int] = (1920, 1080)):
        """
        Initialize camera interface.
        
        Args:
            source: "auto", "webcam", or "picamera2"
            resolution: (width, height) for camera
        """
        self.source = source
        self.resolution = resolution
        self.camera = None
        self.platform = self._detect_platform()
        
        # Auto-detect if needed
        if source == "auto":
            self.source = self._auto_detect_camera()
        
        self._initialize_camera()
    
    def _detect_platform(self) -> str:
        """Detect if running on Pi or laptop."""
        system = platform.system()
        machine = platform.machine()
        
        # Check if Raspberry Pi
        if machine.startswith('arm') or machine.startswith('aarch64'):
            try:
                with open('/proc/device-tree/model', 'r') as f:
                    model = f.read()
                    if 'Raspberry Pi' in model:
                        return "pi"
            except FileNotFoundError:
                pass
        
        return "laptop"
    
    def _auto_detect_camera(self) -> str:
        """Auto-detect best camera source for platform."""
        if self.platform == "pi":
            # Try picamera2 first, fallback to webcam
            try:
                from picamera2 import Picamera2
                logger.info("Detected Raspberry Pi - using picamera2")
                return "picamera2"
            except ImportError:
                # Check for system libcamera
                import shutil
                if shutil.which("libcamera-hello"):
                    logger.warning("picamera2 not available, using libcamera-still subprocess")
                    return "libcamera_sub"
                
                logger.warning("picamera2 not available, falling back to webcam")
                return "webcam"
        else:
            logger.info("Detected laptop - using webcam")
            return "webcam"
    
    def _initialize_camera(self):
        """Initialize the camera based on source."""
        logger.info(f"Initializing camera: {self.source}")
        
        if self.source == "picamera2":
            self._init_picamera2()
        elif self.source == "webcam":
            self._init_webcam()
        elif self.source == "libcamera_sub":
            logger.info("Using libcamera subprocess mode (No init required)")
        else:
            raise ValueError(f"Unknown camera source: {self.source}")
    
    def _init_picamera2(self):
        """Initialize Pi HQ Camera using picamera2."""
        try:
            from picamera2 import Picamera2
            
            self.camera = Picamera2()
            
            # Configure camera
            config = self.camera.create_still_configuration(
                main={"size": self.resolution}
            )
            self.camera.configure(config)
            self.camera.start()
            
            logger.info(f"Pi Camera initialized at {self.resolution}")
            
        except ImportError:
            raise ImportError(
                "picamera2 not installed. Install with: sudo apt install python3-picamera2"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Pi Camera: {e}")
    
    def _init_webcam(self):
        """Initialize webcam using OpenCV."""
        # Try device 0 (default webcam)
        self.camera = cv2.VideoCapture(0)
        
        if not self.camera.isOpened():
            raise RuntimeError("Failed to open webcam. Is it connected?")
        
        # Set resolution
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
        
        logger.info(f"Webcam initialized at {self.resolution}")
    
    def capture(self) -> Optional[np.ndarray]:
        """
        Capture a frame from camera.
        
        Returns:
            numpy array (BGR format) or None if failed
        """
        if self.source == "picamera2":
            return self._capture_picamera2()
        elif self.source == "libcamera_sub":
            return self._capture_libcamera_sub()
        elif self.source == "webcam":
            return self._capture_webcam()
        else:
            logger.error(f"Unknown camera source: {self.source}")
            return None
    
    def _capture_picamera2(self) -> Optional[np.ndarray]:
        """Capture from Pi Camera."""
        try:
            # Capture as numpy array
            frame = self.camera.capture_array()
            
            # Convert RGB to BGR for OpenCV compatibility
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            
            return frame_bgr
            
        except Exception as e:
            logger.error(f"Failed to capture from Pi Camera: {e}")
            return None

    def _capture_libcamera_sub(self) -> Optional[np.ndarray]:
        """Capture from Pi Camera using system command (fallback)."""
        import subprocess
        import os
        
        try:
            # Run libcamera-still command
            # --immediate: fast capture
            # --nopreview: pure capture
            # -o: output file
            cmd = [
                "libcamera-still",
                "-o", "/tmp/gemini_capture.jpg",
                "--immediate",
                "--nopreview",
                "--width", str(self.resolution[0]),
                "--height", str(self.resolution[1]),
                "--timeout", "1" # Fast timeout
            ]
            
            subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Read back
            if os.path.exists("/tmp/gemini_capture.jpg"):
                frame = cv2.imread("/tmp/gemini_capture.jpg")
                return frame
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to capture via libcamera-still: {e}")
            return None
    
    def _capture_webcam(self) -> Optional[np.ndarray]:
        """Capture from webcam."""
        ret, frame = self.camera.read()
        
        if not ret:
            logger.error("Failed to capture from webcam")
            return None
        
        return frame
    
    def save_image(self, frame: np.ndarray, filepath: str):
        """Save captured frame to file."""
        cv2.imwrite(filepath, frame)
        logger.info(f"Image saved to {filepath}")
    
    def release(self):
        """Release camera resources."""
        if self.camera is not None:
            if self.source == "picamera2":
                self.camera.stop()
            elif self.source == "webcam":
                self.camera.release()
            
            logger.info("Camera released")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - release camera."""
        self.release()


# Test function
if __name__ == "__main__":
    print("Testing Camera Interface...")
    
    with CameraInterface(source="auto") as camera:
        print(f"Camera initialized: {camera.source}")
        
        # Capture test image
        frame = camera.capture()
        
        if frame is not None:
            print(f"Captured frame: {frame.shape}")
            camera.save_image(frame, "/tmp/test_capture.jpg")
            print("✓ Test image saved to /tmp/test_capture.jpg")
        else:
            print("✗ Failed to capture image")
