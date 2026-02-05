import flet as ft
import cv2
# Reduce OpenCV terminal noise: only show errors (no "can't capture by index" warnings during camera scan)
try:
    cv2.setLogLevel(3)  # 3 = LOG_LEVEL_ERROR; 4 = SILENT
except AttributeError:
    pass
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
    # Colors (Cursor-inspired dark theme)
    BACKGROUND  = "#050816"      # Deep space
    SURFACE     = "#0B1020"      # Main surface
    SURFACE_ALT = "#050A18"      # Slightly darker
    BORDER      = "#1E293B"      # Subtle borders
    ACCENT_MAIN = "#22C55E"      # Green (run / ready)
    ACCENT_SEC  = "#38BDF8"      # Cyan (links / focus)
    TEXT_MAIN   = "#E5E7EB"
    TEXT_DIM    = "#6B7280"
    
    # Styles
    params_glass_container = {
        "border": ft.Border.all(1, BORDER),
        "border_radius": 8,
        "bgcolor": "#E6050A18",  # Slight translucency over background
        "padding": 16,
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
        self.run_counter = 0
        self.current_run_body = None
        self.selected_model = "flash"  # "flash" or "pro"
        self.thought_stream_enabled = True  # When False, thought agent is not called (saves API)
        self.is_processing = False  # True while chat/thought agents are running
        
        # UI control refs (will be set during UI build)
        self._progress_ring = None
        self._status_text = None

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
        page.title = "A.R.I.A. Platform // Desktop Agent"
        page.theme_mode = ft.ThemeMode.DARK
        page.bgcolor = AriaTheme.BACKGROUND
        page.padding = 0 
        page.fonts = {"Mono": "JetBrains Mono, Consolas, monospace"}
        page.theme = ft.Theme(font_family="Mono")

        # --- LEFT SIDEBAR (Cursor-like rail) ---
        sidebar = ft.Container(
            width=60,
            bgcolor=AriaTheme.SURFACE,
            border=ft.Border.only(right=ft.BorderSide(1, AriaTheme.BORDER)),
            padding=ft.Padding.symmetric(vertical=20),
            content=ft.Column(
                controls=[
                    ft.Icon(ft.Icons.MEMORY, color=AriaTheme.ACCENT_MAIN, size=30),
                    ft.Container(height=20),
                    ft.IconButton(ft.Icons.CHAT, icon_color=AriaTheme.TEXT_MAIN, tooltip="Chat"),
                    ft.IconButton(ft.Icons.VISIBILITY, icon_color=AriaTheme.TEXT_DIM, tooltip="Vision Link"),
                    ft.Container(expand=True),
                    ft.Icon(ft.Icons.CIRCLE, color=AriaTheme.ACCENT_SEC, size=10),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            )
        )

        # --- SIDE PANEL COMPONENTS (Vision + Thought Stream stacked) ---
        # Vision control (top)
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
            height=180,
            content=ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.LENS, size=12, color=AriaTheme.ACCENT_MAIN),
                    ft.Text("VISION LINK", color=AriaTheme.ACCENT_MAIN, size=11, weight="bold"),
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

        # Thought stream toggle (saves API when off)
        self.thought_stream_switch = ft.Switch(
            value=True,
            active_color=AriaTheme.ACCENT_MAIN,
            on_change=self.handle_thought_stream_toggle,
        )
        # Clear thought stream button
        self.clear_thought_btn = ft.IconButton(
            ft.Icons.DELETE_SWEEP,
            icon_color=AriaTheme.TEXT_DIM,
            icon_size=18,
            tooltip="Clear thought stream",
            on_click=self.handle_clear_thought_stream,
        )
        # Thought stream (bottom) – shows "thinking" like Cursor tool logs
        log_section = ft.Container(
            **AriaTheme.params_glass_container,
            expand=True,
            content=ft.Column([
                ft.Row([
                    ft.Icon(ft.Icons.TERMINAL, size=12, color=AriaTheme.ACCENT_SEC),
                    ft.Text("THOUGHT STREAM", color=AriaTheme.ACCENT_SEC, size=11, weight="bold"),
                    ft.Container(expand=True),
                    ft.Text("On", size=9, color=AriaTheme.TEXT_DIM),
                    self.thought_stream_switch,
                    self.clear_thought_btn,
                ], vertical_alignment=ft.CrossAxisAlignment.CENTER),
                ft.Divider(color=AriaTheme.BORDER, thickness=1),
                ft.Container(
                    content=self.cortex_log,
                    bgcolor=AriaTheme.SURFACE_ALT,
                    border=ft.Border.all(1, AriaTheme.BORDER),
                    border_radius=2,
                    expand=True,
                ),
            ])
        )

        side_panel = ft.Container(
            expand=2,
            content=ft.Column([vision_section, log_section], spacing=10)
        )

        # --- MAIN CHAT PANEL (Cursor-style center chat) ---
        self.send_button = ft.IconButton(
            ft.Icons.SEND_ROUNDED,
            icon_color=AriaTheme.ACCENT_SEC,
            icon_size=22,
            on_click=lambda e: self.handle_chat_submit(e),
            tooltip="Send message",
        )
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

        # Model selection dropdown
        self.model_dropdown = ft.Dropdown(
            width=150,
            options=[
                ft.dropdown.Option("flash", "Gemini Flash"),
                ft.dropdown.Option("pro", "Gemini Pro"),
            ],
            value="flash",
            text_size=10,
            text_style=ft.TextStyle(font_family="Mono", color=AriaTheme.TEXT_MAIN),
            bgcolor=AriaTheme.SURFACE_ALT,
            border_color=AriaTheme.BORDER,
            border_radius=999,
            content_padding=ft.Padding.symmetric(horizontal=8, vertical=4),
        )
        self.model_dropdown.on_change = self.handle_model_change

        chat_header = ft.Row(
            [
                ft.Icon(ft.Icons.CHAT_BUBBLE_OUTLINE, size=16, color=AriaTheme.TEXT_MAIN),
                ft.Text("Chat with A.R.I.A", size=13, weight="bold", color=AriaTheme.TEXT_MAIN),
                ft.Container(expand=True),
                ft.Container(
                    content=ft.Row(
                        [
                            ft.Icon(ft.Icons.BOLT, size=12, color=AriaTheme.ACCENT_MAIN),
                            self.model_dropdown,
                        ],
                        spacing=4,
                        vertical_alignment=ft.CrossAxisAlignment.CENTER,
                    ),
                    padding=ft.Padding.only(left=8, right=8, top=4, bottom=4),
                    border_radius=999,
                    border=ft.Border.all(1, AriaTheme.BORDER),
                    bgcolor=AriaTheme.SURFACE_ALT,
                ),
            ],
            alignment=ft.MainAxisAlignment.START,
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        )

        chat_section = ft.Container(
            **AriaTheme.params_glass_container,
            expand=3,
            content=ft.Column(
                [
                    chat_header,
                    ft.Divider(color=AriaTheme.BORDER, thickness=1),
                    ft.Container(
                        content=self.chat_history,
                        expand=True,
                        padding=ft.Padding.only(right=8),
                    ),
                    ft.Divider(color=AriaTheme.BORDER, thickness=1),
                    ft.Row(
                        [
                            self.input_field,
                            self.send_button,
                        ],
                        alignment=ft.MainAxisAlignment.END,
                    ),
                ],
                spacing=8,
            ),
        )

        # --- Main Layout Assembly ---
        main_content = ft.Container(
            expand=True,
            padding=20,
            content=ft.Column([
                ft.Row([
                    ft.Text("A.R.I.A. PLATFORM", size=24, weight="bold", font_family="Mono"),
                    ft.Container(
                        content=ft.Text("Desktop Agent", size=11, color=AriaTheme.TEXT_DIM),
                        bgcolor=AriaTheme.SURFACE_ALT,
                        padding=ft.Padding.symmetric(horizontal=4),
                        border_radius=2
                    ),
                    ft.Container(expand=True),
                    # Status: "Ready" or "Thinking..." (loading state)
                    ft.Container(
                        content=self._build_status_row(),
                        padding=ft.Padding.only(left=8, right=8, top=4, bottom=4),
                        border_radius=999,
                        bgcolor="#06111F",
                    ),
                ]),
                ft.Container(height=10),
                ft.Row([chat_section, side_panel], expand=True, spacing=10)
            ])
        )

        page.add(ft.Row([sidebar, main_content], expand=True, spacing=0))
        
        # Init
        self.log_event("SYSTEM", "UI_LAYOUT_V3_LOADED")
        self.add_chat_message("A.R.I.A", "Systems online. Ready for command.")
        self.detect_cameras()
        
        # Log initial quota status
        quota_status = self.coordinator.check_quota_status()
        if quota_status["warning_level"] != "ok":
            self.log_event("SYSTEM", quota_status["message"])

    def _build_status_row(self):
        """Build status row and keep refs to progress ring and text for loading state."""
        # Create controls and store references for later updates
        self._progress_ring = ft.ProgressRing(
            visible=False, 
            width=14, 
            height=14, 
            stroke_width=2, 
            color=AriaTheme.ACCENT_SEC
        )
        self._status_text = ft.Text("Ready", size=11, color=AriaTheme.TEXT_DIM)
        return ft.Row(
            [
                self._progress_ring,
                ft.Icon(ft.Icons.CIRCLE, size=10, color=AriaTheme.ACCENT_MAIN),
                self._status_text,
            ],
            spacing=6,
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        )

    def _set_processing(self, processing: bool):
        """Enable/disable input and send button; show Thinking... or Ready."""
        self.is_processing = processing
        
        # Update status indicator controls if they exist
        if self._progress_ring is not None:
            self._progress_ring.visible = processing
        if self._status_text is not None:
            self._status_text.value = "Thinking..." if processing else "Ready"
        
        # Update input and send button
        if self.input_field:
            self.input_field.disabled = processing
        if self.send_button:
            self.send_button.disabled = processing
        
        # Force full page update to ensure UI reflects all changes
        if self.page:
            self.page.update()

    def start_new_run(self, user_text: str):
        """
        Creates a Trae-style grouped run in the Thought Stream.

        Each user message starts a new run card with a header and a
        collapsible body where individual THINKING events are attached.
        """
        self.run_counter += 1
        timestamp = datetime.now().strftime("%H:%M:%S")

        # Short preview of the user instruction
        preview = (user_text.strip().replace("\n", " ")[:80] + "…") if len(user_text) > 80 else user_text

        self.current_run_body = ft.Column(spacing=4, tight=True)

        header_row = ft.Row(
            [
                ft.Text(
                    f"Run #{self.run_counter}",
                    size=11,
                    weight="bold",
                    font_family="Mono",
                    color=AriaTheme.TEXT_MAIN,
                ),
                ft.Container(expand=True),
                ft.Text(
                    timestamp,
                    size=9,
                    font_family="Mono",
                    color=AriaTheme.TEXT_DIM,
                ),
            ],
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        )

        run_tile = ft.ExpansionTile(
            title=header_row,
            subtitle=ft.Text(
                preview,
                size=10,
                font_family="Mono",
                color=AriaTheme.TEXT_DIM,
                no_wrap=False,
            ),
            controls=[self.current_run_body],
        )

        self.cortex_log.controls.append(run_tile)
        if self.page:
            self.page.update()

    def log_event(self, source, text):
        """
        Adds a Trae-style card to the Thought Stream on the left.

        Instead of plain text lines, each event is rendered as a compact
        log card with a phase tag, timestamp, and message – similar to
        Trae / Cursor thought timelines.
        """
        timestamp = datetime.now().strftime("%H:%M:%S")

        # Base styling by source
        accent_color = AriaTheme.ACCENT_SEC
        header_label = "SYSTEM"
        body_color = AriaTheme.TEXT_MAIN

        if source == "THINKING":
            accent_color = AriaTheme.ACCENT_MAIN
            header_label = "CORTEX"

        # Try to detect an explicit phase tag from the text like: [PLAN], [SEARCH], etc.
        phase_label = header_label
        if "[" in text and "]" in text:
            try:
                phase_label = text[text.index("[") + 1 : text.index("]")].strip() or header_label
            except ValueError:
                phase_label = header_label

        # Card layout: thin colored rail + content column
        card = ft.Container(
            bgcolor=AriaTheme.SURFACE_ALT,
            border=ft.Border.all(1, AriaTheme.BORDER),
            border_radius=6,
            padding=8,
            content=ft.Row(
                [
                    ft.Container(
                        width=3,
                        bgcolor=accent_color,
                        border_radius=999,
                    ),
                    ft.Container(
                        expand=True,
                        padding=ft.Padding.only(left=8),
                        content=ft.Column(
                            [
                                ft.Row(
                                    [
                                        ft.Text(
                                            f"{timestamp}",
                                            size=9,
                                            font_family="Mono",
                                            color=AriaTheme.TEXT_DIM,
                                        ),
                                        ft.Container(
                                            content=ft.Text(
                                                phase_label.upper(),
                                                size=9,
                                                font_family="Mono",
                                                color=accent_color,
                                                weight="bold",
                                            ),
                                            padding=ft.Padding.symmetric(
                                                horizontal=6, vertical=2
                                            ),
                                            border_radius=999,
                                            border=ft.Border.all(1, accent_color),
                                        ),
                                    ],
                                    spacing=6,
                                    vertical_alignment=ft.CrossAxisAlignment.CENTER,
                                ),
                                ft.Text(
                                    text,
                                    size=10,
                                    font_family="Mono",
                                    color=body_color,
                                    no_wrap=False,
                                ),
                            ],
                            spacing=4,
                            tight=True,
                        ),
                    ),
                ],
                vertical_alignment=ft.CrossAxisAlignment.START,
            ),
        )

        # THINKING logs attach inside the current run's body if present,
        # giving you grouped, collapsible runs similar to Trae / SOLO mode.
        if source == "THINKING" and self.current_run_body is not None:
            self.current_run_body.controls.append(card)
        else:
            self.cortex_log.controls.append(card)

        if self.page:
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
        """
        Scan for cameras by trying indices 0–4 with DSHOW/MSMF (Windows) or V4L2 (Linux).
        OpenCV prints warnings when an index has no camera; we set cv2.setLogLevel(3) at startup to hide them.
        """
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

    def handle_thought_stream_toggle(self, e):
        """Toggle thought stream on/off (when off, thought agent is not called — saves API)."""
        self.thought_stream_enabled = bool(e.control.value)
        self.log_event("SYSTEM", f"THOUGHT_STREAM: {'ON' if self.thought_stream_enabled else 'OFF'}")

    def handle_clear_thought_stream(self, e):
        """Clear all runs and cards in the thought stream; reset run counter."""
        self.cortex_log.controls.clear()
        self.run_counter = 0
        self.current_run_body = None
        # Log after clear so one system card appears
        if self.page:
            self.log_event("SYSTEM", "THOUGHT_STREAM_CLEARED")
            self.page.update()

    def handle_model_change(self, e):
        """Handle model selection dropdown change."""
        self.selected_model = e.control.value or "flash"
        model_display = "Gemini Flash" if self.selected_model == "flash" else "Gemini Pro"
        self.log_event("SYSTEM", f"MODEL_SWITCH: {model_display}")

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
        user_text = (self.input_field.value or "").strip()
        if not user_text:
            return
        if self.is_processing:
            return

        # Disable input and send; show "Thinking..." (do this first before any other updates)
        self._set_processing(True)

        # Start a new grouped run in the Thought Stream (if enabled we'll fill it; if not, minimal logs only).
        self.start_new_run(user_text)
        self.add_chat_message("USER", user_text)
        self.input_field.value = ""
        # _set_processing already called page.update(), but we need one more for the new run and message
        if self.page:
            self.page.update()

        async def process_request():
            try:
                self.add_chat_message("A.R.I.A", "")
                ai_bubble_row = self.chat_history.controls[-1]
                ai_text_control = ai_bubble_row.controls[0].content.controls[1]
                full_response = ""

                async def stream_chat():
                    nonlocal full_response
                    async for chunk in self.coordinator.process_query(
                        user_text,
                        image_data=self.current_frame_bytes,
                        log_callback=lambda src, txt: self.log_event(src, txt),
                        preferred_model=self.selected_model,
                    ):
                        full_response += chunk
                        ai_text_control.value = full_response
                        if self.page:
                            self.page.update()
                    quota_status = self.coordinator.check_quota_status()
                    if quota_status["warning_level"] != "ok":
                        self.log_event("SYSTEM", quota_status["message"])

                async def stream_thoughts():
                    async for line in self.coordinator.generate_thought_stream(
                        user_text,
                        image_data=self.current_frame_bytes,
                        log_callback=lambda src, txt: self.log_event(src, txt),
                    ):
                        self.log_event("THINKING", line)

                if self.thought_stream_enabled:
                    await asyncio.gather(stream_chat(), stream_thoughts())
                else:
                    await stream_chat()
            finally:
                self.current_run_body = None
                # Re-enable UI (this runs in background thread, but Flet handles it)
                self._set_processing(False)

        def run_async_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(process_request())
            finally:
                loop.close()

        threading.Thread(target=run_async_loop, daemon=True).start()

if __name__ == "__main__":
    app = AriaDesktopApp()
    ft.run(app.main)
