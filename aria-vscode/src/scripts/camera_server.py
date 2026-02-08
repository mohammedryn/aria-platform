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
                
                # Write to temp file to avoid stdout buffering issues with large strings
                import tempfile
                import os
                
                tmp_filename = os.path.join(tempfile.gettempdir(), f'aria_capture_{int(time.time())}.txt')
                with open(tmp_filename, 'w') as f:
                    f.write(b64)
                
                resp = json.dumps({"success": True, "base64": "FILE_MODE"}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(resp)
                
                # Notify Extension via Stdout
                print(f"CAPTURE_FILE:{tmp_filename}")
                sys.stdout.flush()

                # Signal to shut down after capture
                threading.Timer(0.5, server.shutdown).start() 
            else:
                self.send_response(500)
                self.end_headers()
        elif self.path == '/start_record':
            import tempfile
            import os
            
            # Start Recording
            try:
                tmp_filename = os.path.join(tempfile.gettempdir(), f'aria_video_{int(time.time())}.mp4')
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                # 640x480 is what we set in start_camera
                server.video_writer = cv2.VideoWriter(tmp_filename, fourcc, 20.0, (640, 480))
                server.video_file = tmp_filename
                server.recording = True
                
                print(f"DEBUG: Recording started to {tmp_filename}")
                sys.stdout.flush()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                print(f"DEBUG: Start record failed: {e}")
                sys.stdout.flush()
                self.send_response(500)
                self.end_headers()

        elif self.path == '/stop_record':
            # Stop Recording
            server.recording = False
            time.sleep(0.5) # Wait for last frame
            
            if server.video_writer:
                server.video_writer.release()
                server.video_writer = None
            
            # Notify Extension
            if hasattr(server, 'video_file'):
                print(f"VIDEO_FILE:{server.video_file}")
                sys.stdout.flush()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            
            # Signal to shut down
            threading.Timer(0.5, server.shutdown).start()

class StreamingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    latest_frame = None
    daemon_threads = True
    recording = False
    video_writer = None
    video_file = None

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
            
            # Record if active
            if server.recording and server.video_writer:
                server.video_writer.write(frame)

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
