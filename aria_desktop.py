import flet as ft
import cv2
import threading
import base64
import time
import sys
import os
import asyncio
from datetime import datetime

# Ensure we can import from src
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from src.core.coordinator import GeminiCoordinator

# --- THEME CONFIGURATION ---
class AriaTheme:
    # Colors (Modern IDE / Zinc Palette)
    BACKGROUND  = "#09090b"      # Zinc 950 (Main App Background)
    SURFACE     = "#18181b"      # Zinc 900 (Panels/Sidebar)
    SURFACE_ALT = "#27272a"      # Zinc 800 (Inputs/Hovers)
    BORDER      = "#3f3f46"      # Zinc 700 (Subtle Borders)
    
    ACCENT_MAIN = "#22c55e"      # Green 500 (Success/Active)
    ACCENT_SEC  = "#3b82f6"      # Blue 500 (Focus/Action)
    ACCENT_WARN = "#f59e0b"      # Amber 500 (Warning)
    ACCENT_ERR  = "#ef4444"      # Red 500 (Error)
    
    TEXT_MAIN   = "#e4e4e7"      # Zinc 200
    TEXT_DIM    = "#a1a1aa"      # Zinc 400
    
    FONT_MONO   = "JetBrains Mono, Consolas, monospace"

# --- COMPONENTS ---

class FileExplorer(ft.Container):
    def __init__(self, open_file_callback):
        super().__init__()
        self.open_file_callback = open_file_callback
        self.width = 250
        self.bgcolor = AriaTheme.SURFACE
        self.border = ft.Border.only(right=ft.BorderSide(1, AriaTheme.BORDER))
        self.padding = 10
        self.content = self._build_tree()

    def _build_tree(self):
        # specific to d:\aria-platform for this environment
        root_path = os.getcwd()
        file_list = ft.Column(spacing=2, scroll=ft.ScrollMode.AUTO)
        
        file_list.controls.append(
            ft.Text("EXPLORER", size=11, weight="bold", color=AriaTheme.TEXT_DIM)
        )
        file_list.controls.append(ft.Container(height=10))

        try:
            # Simple flat list for now to ensure robustness, could be recursive later
            for item in os.listdir(root_path):
                if item.startswith('.') or item.startswith('__'): continue
                
                icon = ft.Icons.INSERT_DRIVE_FILE_OUTLINED
                if os.path.isdir(os.path.join(root_path, item)):
                    icon = ft.Icons.FOLDER_OPEN_OUTLINED
                
                is_dir = os.path.isdir(os.path.join(root_path, item))
                
                btn = ft.Container(
                    content=ft.Row([
                        ft.Icon(icon, size=14, color=AriaTheme.TEXT_DIM),
                        ft.Text(item, size=13, color=AriaTheme.TEXT_MAIN, max_lines=1, overflow=ft.TextOverflow.ELLIPSIS)
                    ], spacing=5),
                    padding=5,
                    border_radius=4,
                    on_click=lambda e, p=os.path.join(root_path, item): self.open_file_callback(p) if not os.path.isdir(p) else None,
                    ink=True,
                )
                file_list.controls.append(btn)
        except Exception as e:
            file_list.controls.append(ft.Text(f"Error loading files: {e}", color=AriaTheme.ACCENT_ERR, size=10))

        return file_list

class EditorWorkspace(ft.Container):
    def __init__(self):
        super().__init__()
        self.expand = True
        self.bgcolor = AriaTheme.BACKGROUND
        self.tabs = ft.Tabs(
            selected_index=0,
            animation_duration=300,
            expand=True,
            divider_color=AriaTheme.BORDER,
            indicator_color=AriaTheme.ACCENT_SEC,
            label_color=AriaTheme.TEXT_MAIN,
            unselected_label_color=AriaTheme.TEXT_DIM,
        )
        
        # Empty State
        self.empty_state = ft.Column([
            ft.Icon(ft.Icons.CODE, size=64, color=AriaTheme.SURFACE_ALT),
            ft.Text("No Open Files", size=20, weight="bold", color=AriaTheme.TEXT_DIM),
            ft.Text("Select a file from the explorer to start editing.", size=14, color=AriaTheme.TEXT_DIM),
            ft.Container(height=20),
            ft.OutlinedButton("Create New Project", icon=ft.Icons.ADD, style=ft.ButtonStyle(color=AriaTheme.ACCENT_SEC))
        ], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER)

        self.content = self.empty_state

    def open_file(self, path):
        filename = os.path.basename(path)
        
        # Check if already open
        for i, tab in enumerate(self.tabs.tabs):
            if tab.text == filename:
                self.tabs.selected_index = i
                self.tabs.update()
                return

        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            content = f"Error reading file: {path}"

        # Create Editor Tab
        editor = ft.TextField(
            value=content,
            multiline=True,
            text_style=ft.TextStyle(font_family=AriaTheme.FONT_MONO, size=13, color=AriaTheme.TEXT_MAIN),
            border_color="transparent",
            bgcolor="transparent",
            expand=True,
            min_lines=20,
        )

        new_tab = ft.Tab(
            text=filename,
            content=ft.Container(
                content=editor,
                padding=10,
                alignment=ft.alignment.top_left,
            )
        )
        
        self.tabs.tabs.append(new_tab)
        self.tabs.selected_index = len(self.tabs.tabs) - 1
        
        # Switch to Tabs view if this is the first file
        if self.content == self.empty_state:
            self.content = self.tabs
        
        self.update()

class VisionPanel(ft.Container):
    def __init__(self, log_callback):
        super().__init__()
        self.log_callback = log_callback
        self.camera_active = False
        self.cap = None
        self.lock = threading.Lock()
        self.expand = True
        self.bgcolor = "black"
        self.image_control = ft.Image(
            src_base64=None,
            width=640,
            height=480,
            fit=ft.ImageFit.CONTAIN,
            visible=False
        )
        self.placeholder = ft.Column([
            ft.Icon(ft.Icons.VIDEOCAM_OFF, size=40, color=AriaTheme.BORDER),
            ft.Text("CAMERA IDLE", color=AriaTheme.BORDER, weight="bold")
        ], alignment=ft.MainAxisAlignment.CENTER, horizontal_alignment=ft.CrossAxisAlignment.CENTER)

        self.content = ft.Stack([
            ft.Container(content=self.placeholder, alignment=ft.alignment.center),
            ft.Container(content=self.image_control, alignment=ft.alignment.center),
            # Overlay controls
            ft.Container(
                content=ft.Row([
                    ft.Container(
                        content=ft.Text("LIVE FEED", size=10, weight="bold", color="white"),
                        bgcolor=AriaTheme.ACCENT_ERR,
                        padding=ft.Padding.symmetric(horizontal=8, vertical=2),
                        border_radius=4,
                    )
                ]),
                top=10, left=10, visible=False, ref=self._get_ref("overlay")
            )
        ])

    def _get_ref(self, name):
        # Helper for refs if needed
        return None 

    def toggle_camera(self, active):
        if active:
            if not self.camera_active:
                self.camera_active = True
                self.image_control.visible = True
                self.placeholder.visible = False
                threading.Thread(target=self._camera_loop, daemon=True).start()
        else:
            self.camera_active = False
            self.image_control.visible = False
            self.placeholder.visible = True
        self.update()

    def _camera_loop(self):
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            self.log_callback("SYSTEM", "Camera init failed")
            self.toggle_camera(False)
            return

        while self.camera_active:
            ret, frame = cap.read()
            if ret:
                _, buffer = cv2.imencode('.jpg', frame)
                b64 = base64.b64encode(buffer).decode('utf-8')
                self.image_control.src_base64 = b64
                self.image_control.update()
            time.sleep(0.03)
        
        cap.release()

class AriaIDE:
    def __init__(self):
        self.page = None
        self.coordinator = GeminiCoordinator()
        self.vision_panel = None
        self.editor = None
        self.log_panel = None
        self.copilot_history = ft.Column(scroll=ft.ScrollMode.AUTO, spacing=10)
        self.thought_stream_active = False

    def main(self, page: ft.Page):
        self.page = page
        page.title = "A.R.I.A. Platform // IDE"
        page.theme_mode = ft.ThemeMode.DARK
        page.bgcolor = AriaTheme.BACKGROUND
        page.padding = 0
        page.window_min_width = 1000
        page.window_min_height = 700
        page.fonts = {"Mono": AriaTheme.FONT_MONO}
        page.theme = ft.Theme(font_family="Mono", color_scheme_seed=AriaTheme.ACCENT_SEC)

        # 1. Left Sidebar (Explorer)
        sidebar = FileExplorer(self.open_file_request)

        # 2. Center Area (Tabs)
        self.editor = EditorWorkspace()
        self.vision_panel = VisionPanel(self.internal_log)
        
        # We wrap VisionPanel in a tab so it can be opened
        self.vision_tab = ft.Tab(text="HARDWARE LINK", content=self.vision_panel)
        self.editor.tabs.tabs.insert(0, self.vision_tab) # Add hardware tab first
        self.editor.content = self.editor.tabs # Start with tabs visible for hardware

        # 3. Right Panel (Copilot)
        self.copilot_input = ft.TextField(
            hint_text="Command / Ask Copilot...",
            text_style=ft.TextStyle(size=13),
            border_radius=8,
            filled=True,
            bgcolor=AriaTheme.SURFACE_ALT,
            border_color="transparent",
            content_padding=10,
            on_submit=self.handle_command,
            expand=True
        )

        right_panel = ft.Container(
            width=350,
            bgcolor=AriaTheme.SURFACE,
            border=ft.Border.only(left=ft.BorderSide(1, AriaTheme.BORDER)),
            padding=10,
            content=ft.Column([
                ft.Text("COPILOT", size=11, weight="bold", color=AriaTheme.TEXT_DIM),
                ft.Container(
                    content=self.copilot_history,
                    expand=True,
                    bgcolor=AriaTheme.BACKGROUND,
                    border_radius=8,
                    padding=10
                ),
                ft.Row([
                    self.copilot_input,
                    ft.IconButton(ft.Icons.SEND_ROUNDED, icon_color=AriaTheme.ACCENT_SEC, on_click=self.handle_command)
                ])
            ])
        )

        # 4. Bottom Status Bar & Hidden Logs
        self.status_text = ft.Text("Ready", size=11, color="white")
        self.api_status_indicator = ft.Container(width=8, height=8, border_radius=4, bgcolor=AriaTheme.ACCENT_ERR)
        
        self.log_list = ft.ListView(height=150, spacing=2, visible=False) # Hidden by default
        
        bottom_bar = ft.Container(
            height=25,
            bgcolor=AriaTheme.ACCENT_SEC,
            padding=ft.Padding.symmetric(horizontal=10),
            content=ft.Row([
                self.api_status_indicator,
                ft.Text("A.R.I.A. CORE", size=11, weight="bold", color="white"),
                ft.Container(width=10),
                self.status_text,
                ft.Container(expand=True),
                ft.IconButton(ft.Icons.TERMINAL, icon_color="white", icon_size=14, on_click=self.toggle_logs, tooltip="Toggle Logs")
            ], vertical_alignment=ft.CrossAxisAlignment.CENTER)
        )

        # Assembly
        body = ft.Row([sidebar, self.editor, right_panel], expand=True, spacing=0)
        layout = ft.Column([body, self.log_list, bottom_bar], expand=True, spacing=0)

        page.add(layout)
        page.floating_action_button = None # Explicitly remove any FAB
        
        # Init Checks
        self.check_system_health()

    def open_file_request(self, path):
        self.editor.open_file(path)

    def toggle_logs(self, e):
        self.log_list.visible = not self.log_list.visible
        self.page.update()

    def internal_log(self, source, message):
        # Hidden developer log
        color = AriaTheme.TEXT_DIM
        if source == "ERROR": color = AriaTheme.ACCENT_ERR
        if source == "SYSTEM": color = AriaTheme.ACCENT_WARN
        
        self.log_list.controls.insert(0, ft.Text(f"[{source}] {message}", color=color, size=11, font_family=AriaTheme.FONT_MONO))
        if self.page: self.page.update()

    def check_system_health(self):
        if self.coordinator.api_key:
            self.api_status_indicator.bgcolor = AriaTheme.ACCENT_MAIN
            self.status_text.value = "AI Core Connected"
        else:
            self.api_status_indicator.bgcolor = AriaTheme.ACCENT_WARN
            self.status_text.value = "AI Features Unavailable (Missing Key)"
        self.page.update()

    def handle_command(self, e):
        text = self.copilot_input.value
        if not text: return
        
        self.copilot_input.value = ""
        self.page.update()

        # Add User Command Card
        self.add_copilot_card("USER", text)
        
        # Set Busy State
        self.status_text.value = "Processing..."
        self.page.update()

        # Check for hardware commands
        if "camera" in text.lower() or "vision" in text.lower():
             if "on" in text.lower() or "start" in text.lower():
                 self.vision_panel.toggle_camera(True)
                 self.add_copilot_card("SYSTEM", "Vision Link Activated. Switched to Hardware Tab.")
                 self.editor.tabs.selected_index = 0
                 self.editor.update()
                 self.status_text.value = "Ready"
                 return
             elif "off" in text.lower() or "stop" in text.lower():
                 self.vision_panel.toggle_camera(False)
                 self.add_copilot_card("SYSTEM", "Vision Link Deactivated.")
                 self.status_text.value = "Ready"
                 return

        # AI Processing
        threading.Thread(target=self._run_ai_query, args=(text,), daemon=True).start()

    def _run_ai_query(self, text):
        response_text = ""
        try:
            # We use a loop to simulate streaming for the UI card, 
            # effectively waiting for the full response or chunks
            # Since coordinator is async, we need an event loop
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            async def get_response():
                nonlocal response_text
                async for chunk in self.coordinator.process_query(text, preferred_model="flash"): # Abstracted model
                    response_text += chunk
            
            loop.run_until_complete(get_response())
            loop.close()
            
            self.add_copilot_card("AI", response_text)
            
        except Exception as e:
            self.internal_log("ERROR", f"AI Failed: {e}")
            self.add_copilot_card("SYSTEM", "Command failed. Check developer logs.")
        
        self.status_text.value = "Ready"
        self.page.update()

    def add_copilot_card(self, source, content):
        # Structured Result Card
        card_color = AriaTheme.SURFACE_ALT
        if source == "USER": card_color = AriaTheme.BACKGROUND
        
        header = ft.Text(source, size=10, weight="bold", color=AriaTheme.ACCENT_SEC if source == "AI" else AriaTheme.TEXT_DIM)
        
        body = ft.Markdown(
            content, 
            extension_set=ft.MarkdownExtensionSet.GITHUB_WEB, 
            code_theme="atom-one-dark"
        )
        
        card = ft.Container(
            content=ft.Column([header, body], spacing=2),
            padding=10,
            bgcolor=card_color,
            border_radius=6,
            border=ft.Border.all(1, AriaTheme.BORDER)
        )
        
        self.copilot_history.controls.append(card)
        self.page.update()

if __name__ == "__main__":
    app = AriaIDE()
    ft.run(app.main)