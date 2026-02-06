import cv2
import http.server
import socketserver
import threading
import time
import sys
import json
import base64

# Configuration
PORT = 0  # 0 means auto-assign
CAM_INDEX = 0

class MJPEGHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.end_headers()
            try:
                while True:
                    if server.latest_frame is not None:
                        data = server.latest_frame
                        self.wfile.write(b'--frame\r\n')
                        self.send_header('Content-Type', 'image/jpeg')
                        self.send_header('Content-Length', len(data))
                        self.end_headers()
                        self.wfile.write(data)
                        self.wfile.write(b'\r\n')
                    time.sleep(0.1)
            except Exception as e:
                pass
        elif self.path == '/ping':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'pong')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/trigger':
            # Return current frame as JSON base64
            if server.latest_frame:
                b64 = base64.b64encode(server.latest_frame).decode('utf-8')
                resp = json.dumps({"success": True, "base64": b64}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(resp)
                
                # PRINT BASE64 TO STDOUT FOR EXTENSION TO READ
                print(f"CAPTURE_SUCCESS:{b64}")
                sys.stdout.flush()

                # Signal to shut down after capture
                threading.Timer(0.5, server.shutdown).start() 
            else:
                self.send_response(500)
                self.end_headers()

class StreamingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    latest_frame = None
    daemon_threads = True

def start_camera(server):
    cap = cv2.VideoCapture(CAM_INDEX, cv2.CAP_DSHOW) # CAP_DSHOW for faster Windows startup
    if not cap.isOpened():
        print("Error: Could not open camera")
        return

    while True:
        ret, frame = cap.read()
        if ret:
            # Resize for performance
            frame = cv2.resize(frame, (640, 480))
            # Encode to JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if ret:
                server.latest_frame = buffer.tobytes()
        time.sleep(0.05)

if __name__ == '__main__':
    # Start Server
    # Use 0.0.0.0 to ensure it is accessible, though 127.0.0.1 is safer for local.
    # VS Code Webview sometimes has trouble with 127.0.0.1 if not forwarded.
    server = StreamingServer(('127.0.0.1', 0), MJPEGHandler)
    port = server.server_address[1]
    
    # Start Camera Thread
    cam_thread = threading.Thread(target=start_camera, args=(server,))
    cam_thread.daemon = True
    cam_thread.start()

    # Output port for VS Code to read
    # Use a unique prefix to ensure we don't pick up random logs
    print(f"Server started on port {port}")
    sys.stdout.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
