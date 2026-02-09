import cv2
import sys

def test_camera_indices():
    print(f"Python version: {sys.version}")
    print(f"OpenCV version: {cv2.__version__}")
    print(f"Platform: {sys.platform}")
    
    available_cameras = []
    # Test first 5 indices
    for i in range(5):
        # Try different backends
        backends = [cv2.CAP_ANY]
        if sys.platform != "win32":
             backends.append(cv2.CAP_V4L2)
            
        for backend in backends:
            backend_name = "ANY" if backend == cv2.CAP_ANY else "V4L2"
            print(f"Probing Index {i} with backend {backend_name}...")
            try:
                cap = cv2.VideoCapture(i, backend)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        print(f"SUCCESS: Index {i} available with {backend_name}")
                        available_cameras.append((i, backend_name))
                    else:
                        print(f"FAILED: Index {i} opened with {backend_name} but could not read frame.")
                    cap.release()
                else:
                    print(f"FAILED: Index {i} could not be opened with {backend_name}")
            except Exception as e:
                print(f"EXCEPTION: Index {i} with {backend_name}: {e}")
                
    if not available_cameras:
        print("\nSUMMARY: No cameras detected!")
        if sys.platform != "win32":
            print("Note: In WSL2, you must use 'usbipd' to attach your camera.")
    else:
        print(f"\nSUMMARY: Found {len(available_cameras)} camera configurations.")

if __name__ == "__main__":
    test_camera_indices()
