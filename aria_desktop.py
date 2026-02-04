import flet as ft
import cv2
import threading
import base64
import time
import numpy as np
from datetime import datetime
import sys
import os
import asyncio

# Ensure we can import from src
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from src.core.coordinator import GeminiCoordinator

# --- THEME CONFIGURATION ---
class AriaTheme:
    # Colors
    BACKGROUND = "#050505"      # Deepest Black
    SURFACE    = "#0A0A0A"      # Slightly lighter
    BORDER     = "#333333"      # Subtle borders
    ACCENT_MAIN = "#00F0FF"     # Neon Cyan
    ACCENT_SEC  = "#00FF9D"     # Neon Green
    TEXT_MAIN   = "#FFFFFF"
    TEXT_DIM    = "#666666"
    
    # Styles
    params_glass_container = {
        "border": ft.Border.all(1, BORDER),
        "border_radius": 4, 
        "bgcolor": "#800A0A0A", # 50% Opacity Surface
        "padding": 15,
    }

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
        
        # State
        self.current_frame_bytes = None

        # LEFT PANEL: Cortex Log (Thinking)
        self.cortex_log = ft.ListView(
            expand=True,
            spacing=2,
            padding=10,
            auto_scroll=True,
            divider_thickness=0, 
        )
        
        # RIGHT PANEL: Chat History (User + AI)
        self.chat_history = ft.ListView(
            expand=True,
            spacing=15,
            padding=20,
            auto_scroll=True,
        )

        # Core Brain
        self.coordinator = GeminiCoordinator()

    def main(self, page: ft.Page):
        self.page = page
        page.title = "A.R.I.A. Platform // ENG_CONSOLE"
        page.theme_mode = ft.ThemeMode.DARK
        page.bgcolor = AriaTheme.BACKGROUND
        page.padding = 0 
        page.fonts = {"Mono": "JetBrains Mono, Consolas, monospace"}
        page.theme = ft.Theme(font_family="Mono")

        # --- Sidebar ---
        sidebar = ft.Container(
            width=60,
            bgcolor=AriaTheme.SURFACE,
            border=ft.Border.only(right=ft.BorderSide(1, AriaTheme.BORDER)),
            padding=ft.Padding.symmetric(vertical=20),
            content=ft.Column(
                controls=[
                    ft.Icon(ft.Icons.MEMORY, color=AriaTheme.ACCENT_MAIN, size=30),
                    ft.Container(height=20),
                    ft.IconButton(ft.Icons.DASHBOARD, icon_color=AriaTheme.TEXT_MAIN, tooltip="Console"),
                    ft.IconButton(ft.Icons.VISIBILITY, icon_color=AriaTheme.TEXT_DIM, tooltip="Vision"),
                    ft.Container(expand=True),
                    ft.Icon(ft.Icons.CIRCLE, color=AriaTheme.ACCENT_SEC, size=10),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            )
        )

        # --- LEFT PANEL COMPONENTS ---
        
        # 1. Vision Control (Top Left)
        self.camera_dropdown = ft.Dropdown(
            expand=True,
            options=[],
            label="INPUT_SOURCE",
            border_color=AriaTheme.BORDER,
            text_size=12,
            text_style=ft.TextStyle(font_family="Mono", color=AriaTheme.ACCENT_MAIN),
            bgcolor=AriaTheme.BACKGROUND,
            height=40,
            content_padding=10,
            border_radius=2,
        )
        self.camera_dropdown.on_change = self.handle_camera_change

        vision_section = ft.Container(
            **AriaTheme.params_glass_container,
            height=200, # Fixed height for vision
            content=ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.LENS, size=12, color=AriaTheme.ACCENT_MAIN),
                    ft.Text("VISION CONTROL CENTER", color=AriaTheme.ACCENT_MAIN, size=12, weight="bold"),
                    ft.Container(expand=True),
                    ft.Container(
                        content=ft.Text("STANDBY", size=10, color=AriaTheme.BACKGROUND, weight="bold"),
                        bgcolor=AriaTheme.ACCENT_MAIN,
                        padding=ft.Padding.symmetric(horizontal=8, vertical=2),
                        border_radius=2,
                    )
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                ft.Divider(color=AriaTheme.BORDER, thickness=1),
                ft.Column([
                    ft.Row([
                        ft.OutlinedButton(
                            "INITIALIZE", 
                            icon=ft.Icons.POWER_SETTINGS_NEW,
                            on_click=self.toggle_camera,
                            expand=True,
                            style=ft.ButtonStyle(
                                color={"": AriaTheme.ACCENT_MAIN},
                                side={"": ft.BorderSide(1, AriaTheme.ACCENT_MAIN)},
                                shape={"": ft.RoundedRectangleBorder(radius=2)},
                            )
                        ),
                        ft.IconButton(
                            ft.Icons.REFRESH, 
                            icon_color=AriaTheme.ACCENT_SEC,
                            on_click=lambda _: self.detect_cameras(),
                            tooltip="RESCAN"
                        ),
                    ]),
                    ft.Container(height=5),
                    self.camera_dropdown
                ]),
            ])
        )

        # 2. Cortex Log (Bottom Left)
        log_section = ft.Container(
            **AriaTheme.params_glass_container,
            expand=True,
            content=ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.TERMINAL, size=12, color=AriaTheme.ACCENT_SEC),
                    ft.Text("CORTEX_ACTIVITY_LOG", color=AriaTheme.ACCENT_SEC, size=12, weight="bold"),
                ]),
                ft.Divider(color=AriaTheme.BORDER, thickness=1),
                ft.Container(
                    content=self.cortex_log,
                    bgcolor=AriaTheme.BACKGROUND,
                    border=ft.Border.all(1, AriaTheme.BORDER),
                    border_radius=2,
                    expand=True,
                ),
            ])
        )

        left_panel = ft.Container(
            expand=2, # 40% width approx
            content=ft.Column([vision_section, log_section], spacing=10)
        )

        # --- RIGHT PANEL COMPONENTS (Chat) ---
        
        self.input_field = ft.TextField(
            hint_text="Ask A.R.I.A...",
            border_color=AriaTheme.BORDER,
            text_style=ft.TextStyle(font_family="Mono", color=AriaTheme.TEXT_MAIN),
            expand=True,
            multiline=False,
            text_size=14,
            content_padding=ft.Padding.symmetric(horizontal=20, vertical=15),
            on_submit=self.handle_chat_submit,
            bgcolor=AriaTheme.BACKGROUND,
            cursor_color=AriaTheme.ACCENT_SEC,
            border_radius=25,
            focused_border_color=AriaTheme.ACCENT_SEC
        )

        chat_section = ft.Container(
            **AriaTheme.params_glass_container,
            expand=3, # 60% width
            content=ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.CHAT_BUBBLE, size=12, color=AriaTheme.TEXT_MAIN),
                    ft.Text("GEMINI_UPLINK", color=AriaTheme.TEXT_MAIN, size=12, weight="bold"),
                ]),
                ft.Divider(color=AriaTheme.BORDER, thickness=1),
                
                # Chat History Area
                ft.Container(
                    content=self.chat_history,
                    expand=True,
                ),
                
                # Divider
                ft.Divider(color=AriaTheme.BORDER, thickness=1),

                # Bottom Input Area
                ft.Row([
                    self.input_field,
                    ft.IconButton(
                        ft.Icons.SEND_ROUNDED, 
                        icon_color=AriaTheme.ACCENT_SEC, 
                        icon_size=24,
                        on_click=lambda e: self.handle_chat_submit(e),
                        tooltip="TRANSMIT"
                    )
                ], alignment=ft.MainAxisAlignment.END) 
            ])
        )

        # --- Main Layout Assembly ---
        main_content = ft.Container(
            expand=True,
            padding=20,
            content=ft.Column([
                ft.Row([
                    ft.Text("A.R.I.A. PLATFORM", size=24, weight="bold", font_family="Mono"),
                    ft.Container(
                        content=ft.Text("v3.0.0-SPLIT", size=10, color=AriaTheme.BACKGROUND),
                        bgcolor=AriaTheme.TEXT_DIM,
                        padding=ft.Padding.symmetric(horizontal=4),
                        border_radius=2
                    )
                ]),
                ft.Container(height=10),
                ft.Row([left_panel, chat_section], expand=True, spacing=10)
            ])
        )

        page.add(ft.Row([sidebar, main_content], expand=True, spacing=0))
        
        # Init
        self.log_event("SYSTEM", "UI_LAYOUT_V3_LOADED")
        self.add_chat_message("A.R.I.A", "Systems online. Ready for command.")
        self.detect_cameras()

    def log_event(self, source, text):
        # Adds to Left Panel Log (Thinking)
        color = AriaTheme.TEXT_MAIN
        prefix = ""
        
        if source == "SYSTEM": 
            color = AriaTheme.ACCENT_SEC 
            prefix = "[SYS]"
        elif source == "THINKING":
            color = AriaTheme.ACCENT_MAIN
            prefix = "[CORTEX]"
             
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        self.cortex_log.controls.append(
            ft.Text(f"{timestamp} {prefix} {text}", size=10, font_family="Mono", color=color)
        )
        self.page.update()

    def add_chat_message(self, sender, text):
        # Adds to Right Panel Chat
        align = ft.MainAxisAlignment.START
        bg_color = AriaTheme.SURFACE
        text_color = AriaTheme.TEXT_MAIN
        
        if sender == "USER":
            align = ft.MainAxisAlignment.END
            bg_color = AriaTheme.BORDER # Dark Grey
        else: # AI
            bg_color = "#1A00F0FF" # 10% Opacity Cyan

        self.chat_history.controls.append(
            ft.Row(
                [
                    ft.Container(
                        content=ft.Column([
                            ft.Text(sender, size=10, color=AriaTheme.TEXT_DIM, weight="bold"),
                            ft.Markdown(
                                text, 
                                extension_set=ft.MarkdownExtensionSet.GITHUB_WEB,
                                on_tap_link=lambda e: self.page.launch_url(e.data),
                                code_theme="atom-one-dark",
                            ),
                        ]),
                        padding=15,
                        border_radius=10,
                        bgcolor=bg_color,
                        width=550, # Constrain width to prevent overflow
                    )
                ],
                alignment=align
            )
        )
        self.page.update()

    def toggle_camera(self, e):
        current_time = time.time()
        if current_time - self.last_click_time < 2.0:
            self.log_event("SYSTEM", "RATE_LIMIT_HIT")
            return
        self.last_click_time = current_time

        if self.camera_active:
            self.camera_active = False
            self.log_event("SYSTEM", "VISION_TERMINATED")
            e.control.selected = False
            e.control.update()
        else:
            self.camera_active = True
            e.control.selected = True 
            e.control.update()
            
            self.log_event("SYSTEM", f"INIT_TIMING: CAM_{self.selected_camera_index}")
            self.processing_thread = threading.Thread(target=self.update_camera_feed, daemon=True)
            self.processing_thread.start()
            
            self.page.update()

    def detect_cameras(self):
        self.available_cameras = []
        is_windows = self.page.platform == "windows" or sys.platform == "win32"
        
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
                        break 
        
        self.camera_dropdown.options = [
            ft.dropdown.Option(f"{i}_{bk}", f"DEV_{i}::{'DSHOW' if bk == cv2.CAP_DSHOW else 'MSMF' if bk == cv2.CAP_MSMF else 'V4L2' if bk == cv2.CAP_V4L2 else 'DEF'}") 
            for i, bk in self.available_cameras
        ]
        
        if not self.available_cameras:
             self.camera_dropdown.options.append(ft.dropdown.Option("-1", "NO_SIGNAL"))
             self.camera_dropdown.value = "-1"
             self.log_event("SYSTEM", "NO_HARDWARE_FOUND")
        else:
            first_cam_val = f"{self.available_cameras[0][0]}_{self.available_cameras[0][1]}"
            self.camera_dropdown.value = first_cam_val
            self.selected_camera_index = self.available_cameras[0][0]
            self.selected_backend = self.available_cameras[0][1]
            self.log_event("SYSTEM", f"SCAN_COMPLETE: {len(self.available_cameras)} DEVS")
            
        if self.page:
            self.page.update()

    def handle_camera_change(self, e):
        val = e.control.value
        if val == "-1":
            self.selected_camera_index = -1
            self.log_event("SYSTEM", "MODE: PATTERN_GEN")
        else:
            idx, bk = val.split('_')
            self.selected_camera_index = int(idx)
            self.selected_backend = int(bk)
            self.log_event("SYSTEM", f"ROUTED: CAM_{idx}")

    def update_camera_feed(self):
        if self.selected_camera_index == -1:
             self.log_event("SYSTEM", "TEST_PATTERN_ACTIVE")
             self.test_mode = True
             cap_temp = None
        else:
            backend = getattr(self, 'selected_backend', cv2.CAP_ANY)
            cap_temp = cv2.VideoCapture(self.selected_camera_index, backend)
            cap_temp.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap_temp.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            if not cap_temp.isOpened():
                 self.log_event("SYSTEM", f"ERR_LOCK: CAM_{self.selected_camera_index}")
                 self.test_mode = True
                 cap_temp = None
            else:
                self.log_event("SYSTEM", f"LINK_UP: CAM_{self.selected_camera_index}")
                with self.camera_lock:
                    self.cap = cap_temp

        frame_count = 0
        consecutive_errors = 0
        
        while self.camera_active:
            if self.test_mode:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                frame[:, :] = (20, 30, 40) 
                bar_pos = (frame_count * 5) % 640
                cv2.rectangle(frame, (bar_pos, 200), (bar_pos + 50, 280), (0, 255, 255), -1)
                timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
                cv2.putText(frame, f"TEST MODE - {timestamp}", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                ret = True
            else:
                if self.cap is None or not self.cap.isOpened():
                    break
                ret, frame = self.cap.read()
            
            if not ret:
                consecutive_errors += 1
                if consecutive_errors > 10:
                    self.log_event("SYSTEM", "FATAL_LOSS")
                    break
                time.sleep(0.1)
                continue
            
            consecutive_errors = 0
            frame_count += 1

            try:
                cv2.putText(frame, datetime.now().strftime("%H:%M:%S.%f")[:-3], (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(frame, "NATIVE MODE", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 1)
                cv2.imshow("A.R.I.A. Vision Link", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.camera_active = False
                    break
                
                # Store frame for AI analysis
                try:
                    _, buffer = cv2.imencode('.jpg', frame)
                    self.current_frame_bytes = base64.b64encode(buffer).decode('utf-8')
                except:
                    pass
            except Exception as e:
                print(f"Display error: {e}")

            time.sleep(0.01)

        with self.camera_lock:
            if self.cap:
                self.cap.release()
                self.cap = None
        
        cv2.destroyAllWindows()
        self.log_event("SYSTEM", "STREAM_CLOSED")
        self.test_mode = False

    def handle_chat_submit(self, e):
        user_text = self.input_field.value
        if not user_text:
            return
            
        self.add_chat_message("USER", user_text)
        self.input_field.value = ""
        self.input_field.focus()
        self.page.update()
        
        # Define the async task
        async def process_request():
            # placeholder
            self.add_chat_message("A.R.I.A", "") 
            # Get the last added control (the empty AI bubble) 
            # Note: add_chat_message appends a Row to chat_history.controls
            # The Text control is deep inside: Row -> Container -> Column -> Text(index 1)
            ai_bubble_row = self.chat_history.controls[-1]
            ai_text_control = ai_bubble_row.controls[0].content.controls[1]
            
            full_response = ""
            
            async for chunk in self.coordinator.process_query(
                user_text, 
                image_data=self.current_frame_bytes,
                log_callback=lambda src, txt: self.log_event(src, txt)
            ):
                full_response += chunk
                ai_text_control.value = full_response
                self.page.update()

        # Run in a separate thread to not block UI
        def run_async_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(process_request())
            loop.close()

        threading.Thread(target=run_async_loop, daemon=True).start()

if __name__ == "__main__":
    app = AriaDesktopApp()
    ft.run(app.main)
