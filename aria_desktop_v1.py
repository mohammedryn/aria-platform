import flet as ft
import cv2
import threading
import asyncio
import base64
import time
import numpy as np
from datetime import datetime
import sys
import sys


class AriaDesktopApp:
    def __init__(self):
        self.camera_active = False
        self.cap = None
        self.page = None
        self.camera_lock = threading.Lock()
        self.last_click_time = 0 
        self.test_mode = False 
        self.selected_camera_index = 0
        self.available_cameras = []
        
        # Streaming State
        self.current_frame_bytes = None
        
        # Streaming State
        self.current_frame_bytes = None

        
        self.img_control = ft.Image(
            src="https://via.placeholder.com/640x480/000000/FFFFFF?text=Aria+Vision+Active+(Window)",
            width=640,
            height=480,
            fit=ft.BoxFit.CONTAIN,
            border_radius=ft.BorderRadius.all(10),
            gapless_playback=True,
        )
        self.thought_stream = ft.Column(
            scroll=ft.ScrollMode.AUTO,
            height=200,
            auto_scroll=True,
        )

    def main(self, page: ft.Page):
        self.page = page
        page.title = "A.R.I.A. Platform - Desktop Agent"
        page.theme_mode = ft.ThemeMode.DARK
        page.padding = 20
        page.window_width = 1200
        page.window_height = 800
        page.window_bgcolor = ft.Colors.BLACK
        
        self.camera_dropdown = ft.Dropdown(
            width=220,
            options=[],
            label="Camera Source",
            border_color=ft.Colors.BLUE_GREY_700,
            text_size=12,
        )
        self.camera_dropdown.on_change = self.handle_camera_change

        # --- UI Header ---
        header = ft.Row(
            [
                ft.Icon(ft.Icons.MEMORY, size=30, color=ft.Colors.CYAN),
                ft.Text("A.R.I.A. Platform", size=24, weight="bold", color=ft.Colors.WHITE),
                ft.Container(expand=True),
                ft.Icon(ft.Icons.CIRCLE, size=15, color=ft.Colors.GREEN),
                ft.Text("Gemini 3.0 Connected", size=12, color=ft.Colors.GREEN_200),
            ],
            alignment=ft.MainAxisAlignment.START,
        )

        # --- Left Panel: Vision ---
        vision_panel = ft.Container(
            content=ft.Column(
                [
                    ft.Text("Live Vision Feed", size=16, weight="bold"),
                    ft.Container(
                        content=self.img_control,
                        border=ft.Border.all(2, ft.Colors.BLUE_GREY_800),
                        border_radius=12,
                        bgcolor=ft.Colors.BLACK54,
                        alignment=ft.Alignment.CENTER,
                    ),
                    ft.Row(
                        [
                            ft.IconButton(
                                icon=ft.Icons.CAMERA_ALT, 
                                selected_icon=ft.Icons.VIDEOCAM_OFF,
                                on_click=self.toggle_camera, 
                                tooltip="Toggle Camera",
                                style=ft.ButtonStyle(color={"": ft.Colors.WHITE, "selected": ft.Colors.RED})
                            ),
                            ft.IconButton(
                                icon=ft.Icons.REFRESH, 
                                on_click=lambda _: self.detect_cameras(), 
                                tooltip="Refresh Camera List",
                                icon_color=ft.Colors.GREEN_400
                            ),
                            # ft.IconButton(ft.Icons.CAMERA_ENHANCE, icon_color=ft.Colors.CYAN, tooltip="Analyze Frame"),
                            self.camera_dropdown,
                        ],
                        alignment=ft.MainAxisAlignment.CENTER,
                    ),
                    ft.Text("Video will open in a separate high-performance window", size=10, italic=True, color=ft.Colors.GREY_500),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            width=700,
            padding=10,
            border=ft.Border.all(1, ft.Colors.BLUE_GREY_900),
            border_radius=15,
            bgcolor=ft.Colors.with_opacity(0.3, ft.Colors.BLUE_GREY_900),
        )

        # --- Right Panel: The Council ---
        council_panel = ft.Container(
            content=ft.Column(
                [
                    ft.Text("The Council of Hardware", size=16, weight="bold"),
                    ft.Divider(color=ft.Colors.BLUE_GREY_800),
                    
                    # Thought Stream Area
                    ft.Container(
                        content=self.thought_stream,
                        border=ft.Border.all(1, ft.Colors.BLUE_GREY_800),
                        border_radius=10,
                        padding=10,
                        bgcolor=ft.Colors.BLACK87,
                        expand=True,
                    ),
                    
                    # Quick Actions
                    ft.Text("Quick Actions", size=14, weight="bold", color=ft.Colors.GREY_400),
                    ft.Row(
                        [
                            ft.FilledButton("Verify Circuit", icon=ft.Icons.CHECK_CIRCLE, bgcolor=ft.Colors.GREEN_900, color=ft.Colors.WHITE),
                            ft.FilledButton("Flash Firmware", icon=ft.Icons.FLASH_ON, bgcolor=ft.Colors.AMBER_900, color=ft.Colors.WHITE),
                        ],
                        alignment=ft.MainAxisAlignment.SPACE_EVENLY,
                    ),
                    
                    # Chat Input
                    ft.TextField(
                        label="Ask the Council...",
                        border_color=ft.Colors.BLUE_GREY_700,
                        suffix_icon=ft.Icons.SEND,
                        on_submit=self.handle_chat_submit,
                    ),
                ],
                spacing=15,
            ),
            expand=True,
            padding=15,
            border=ft.Border.all(1, ft.Colors.BLUE_GREY_900),
            border_radius=15,
            bgcolor=ft.Colors.with_opacity(0.3, ft.Colors.BLUE_GREY_900),
        )

        # --- Main Layout ---
        layout = ft.Row(
            [vision_panel, council_panel],
            expand=True,
            spacing=20,
        )

        page.add(header, ft.Divider(color=ft.Colors.TRANSPARENT), layout)
        
        # Add initial thoughts
        self.add_thought("System", "A.R.I.A. Desktop Agent initialized.")
        self.add_thought("System", "Scanning for cameras...")
        
        # Initial camera scan
        self.detect_cameras()

    def add_thought(self, source, text):
        icon = ft.Icons.INFO
        color = ft.Colors.WHITE
        
        if source == "Electronics":
            icon = ft.Icons.ELECTRICAL_SERVICES
            color = ft.Colors.CYAN_200
        elif source == "Mechanical":
            icon = ft.Icons.BUILD
            color = ft.Colors.AMBER_200
        elif source == "System":
            icon = ft.Icons.COMPUTER
            color = ft.Colors.GREY_400
            
        self.thought_stream.controls.append(
            ft.Row(
                [
                    ft.Icon(icon, size=16, color=color),
                    ft.Text(f"{source}: ", weight="bold", color=color, size=12),
                    ft.Text(text, size=12, selectable=True, expand=True),
                ],
                alignment=ft.MainAxisAlignment.START,
                vertical_alignment=ft.CrossAxisAlignment.START,
            )
        )
        self.page.update()

    def toggle_camera(self, e):
        current_time = time.time()
        if current_time - self.last_click_time < 2.0:
            self.add_thought("System", "⚠️ Clicked too fast. Please wait.")
            return
        self.last_click_time = current_time

        if self.camera_active:
            # Turn off
            self.camera_active = False
            self.add_thought("System", "User requested stop.")
            # Clear buffer to show stalled or placeholder? 
            # Actually, standard is to leave last frame or we can send a placeholder byte manually.
            self.current_frame_bytes = None 
            e.control.selected = False
            e.control.update()
        else:
            # Turn on
            if hasattr(self, 'processing_thread') and self.processing_thread.is_alive():
                self.add_thought("System", "⚠️ Camera is already initializing. Please wait.")
                return

            self.camera_active = True
            e.control.selected = True # Turn button red/active
            e.control.update()
            
            self.add_thought("System", f"Initializing camera {self.selected_camera_index}...")
            self.processing_thread = threading.Thread(target=self.update_camera_feed, daemon=True)
            self.processing_thread.start()
            
            self.polling = False
            
            self.page.update()

    def detect_cameras(self):
        self.available_cameras = []
        is_windows = self.page.platform == "windows" or sys.platform == "win32"
        
        # Check indices 0-4
        for i in range(5):
            backends = []
            if is_windows:
                backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
            elif hasattr(cv2, 'CAP_V4L2'):
                backends = [cv2.CAP_V4L2, cv2.CAP_ANY]
            else:
                backends = [cv2.CAP_ANY]
            
            for backend in backends:
                cap = cv2.VideoCapture(i, backend)
                if cap.isOpened():
                    ret, _ = cap.read()
                    cap.release()
                    if ret:
                        self.available_cameras.append((i, backend))
                        break # Found a working backend for this index
        
        # Update dropdown
        self.camera_dropdown.options = [
            ft.dropdown.Option(f"{i}_{bk}", f"Camera {i} ({'DSHOW' if bk == cv2.CAP_DSHOW else 'MSMF' if bk == cv2.CAP_MSMF else 'V4L2' if bk == cv2.CAP_V4L2 else 'Default'})") 
            for i, bk in self.available_cameras
        ]
        
        if not self.available_cameras:
            self.camera_dropdown.options.append(ft.dropdown.Option("-1", "No cameras found"))
            self.camera_dropdown.value = "-1"
            self.add_thought("System", "❌ No hardware cameras detected.")
            if is_windows:
                 self.add_thought("System", "💡 TIP: Check privacy settings or antivirus blocking camera.")
            else:
                 self.add_thought("System", "💡 TIP: If using WSL2, ensure camera is attached via 'usbipd'.")
        else:
            first_cam_val = f"{self.available_cameras[0][0]}_{self.available_cameras[0][1]}"
            self.camera_dropdown.value = first_cam_val
            self.selected_camera_index = self.available_cameras[0][0]
            self.selected_backend = self.available_cameras[0][1]
            self.add_thought("System", f"Detected {len(self.available_cameras)} camera(s).")
            
        if self.page:
            self.page.update()

    def handle_camera_change(self, e):
        val = e.control.value
        if val == "-1":
            self.selected_camera_index = -1
            self.add_thought("System", "Switched to Test Pattern mode")
        else:
            # Parse "index_backend"
            idx, bk = val.split('_')
            self.selected_camera_index = int(idx)
            self.selected_backend = int(bk)
            self.add_thought("System", f"Switched to Camera {idx}")


    def update_camera_feed(self):
        # Try real camera first
        if self.selected_camera_index == -1:
             self.add_thought("System", "Using TEST PATTERN mode (no camera found).")
             self.test_mode = True
             cap_temp = None
        else:
            # Use the selected backend
            backend = getattr(self, 'selected_backend', cv2.CAP_ANY)
            cap_temp = cv2.VideoCapture(self.selected_camera_index, backend)
            
            # Enforce Resolution
            cap_temp.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap_temp.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            if not cap_temp.isOpened():
                 self.add_thought("System", f"⚠️ Camera {self.selected_camera_index} index out of range or busy.")
                 self.add_thought("System", "Falling back to TEST PATTERN mode.")
                 self.test_mode = True
                 cap_temp = None
            else:
                self.add_thought("System", f"Camera {self.selected_camera_index} active. Streaming...")
                with self.camera_lock:
                    self.cap = cap_temp

        # Stream Loop
        frame_count = 0
        consecutive_errors = 0
        
        while self.camera_active:
            if self.test_mode:
                # Generate synthetic test pattern
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                frame[:, :] = (20, 30, 40)  # Dark background
                
                # Animated moving bar
                bar_pos = (frame_count * 5) % 640
                cv2.rectangle(frame, (bar_pos, 200), (bar_pos + 50, 280), (0, 255, 255), -1)
                
                # Timestamp
                timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
                cv2.putText(frame, f"TEST MODE - {timestamp}", (50, 100), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.putText(frame, f"Frame: {frame_count}", (50, 400), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                
                ret = True
            else:
                # Real camera
                if self.cap is None or not self.cap.isOpened():
                    break
                ret, frame = self.cap.read()
            
            if not ret:
                consecutive_errors += 1
                if consecutive_errors > 10:
                    self.add_thought("System", "⚠️ Stream failed. Stopping.")
                    break
                time.sleep(0.1)
                continue
            
            consecutive_errors = 0
            frame_count += 1

            # Display Logic (Native Only)
            try:
                # Add timestamp
                cv2.putText(frame, datetime.now().strftime("%H:%M:%S.%f")[:-3], (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                # NATIVE MODE
                cv2.putText(frame, "NATIVE MODE", (10, 60), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 1)
                cv2.imshow("A.R.I.A. Vision Link", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.camera_active = False
                    break
                    
            except Exception as e:
                print(f"Display error: {e}")

            time.sleep(0.01) # Small sleep to prevent CPU hogging

        # Cleanup
        with self.camera_lock:
            if self.cap:
                self.cap.release()
                self.cap = None
        
        cv2.destroyAllWindows()
        
        mode_str = "TEST PATTERN" if self.test_mode else "CAMERA"
        self.add_thought("System", f"{mode_str} stopped. Frames: {frame_count}")
        self.test_mode = False
        
        # Reset UI
        self.img_control.src = "https://via.placeholder.com/640x480/000000/FFFFFF?text=Camera+Off"
        self.img_control.update()

    def handle_chat_submit(self, e):
        user_text = e.control.value
        self.add_thought("User", user_text)
        e.control.value = ""
        self.page.update()
        
        # Simulate AI response (Stub)
        threading.Timer(1.0, lambda: self.add_thought("Electronics", "I see you're typing... connected to Gemini 3.0?")).start()

if __name__ == "__main__":
    app = AriaDesktopApp()
    ft.run(app.main)
