"""
Developer-first, code-centric desktop UI.
Two-column: editor workspace (left) | collapsible contextual sidebar (right).
Command-oriented input; AI output as inline assistance in sidebar, not chat.
"""
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, message=".*generativeai.*")

import flet as ft
import cv2
try:
    cv2.setLogLevel(3)
except AttributeError:
    pass
import threading
import base64
import sys
import os
import asyncio

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from src.core.coordinator import GeminiCoordinator

# --- IDE-style theme: distinct dark, electronics/dev identity ---
class IDETheme:
    BACKGROUND   = "#1e1e1e"   # Primary background
    SURFACE      = "#252526"   # Secondary background / panels
    SIDEBAR      = "#333333"   # Sidebar
    BORDER       = "#2b2b2b"   # Subtle borders
    ACCENT       = "#007ACC"   # Blue
    TEXT_MAIN    = "#CCCCCC"
    TEXT_DIM     = "#969696"
    COMMENTS     = "#6A9955"
    KEYWORDS     = "#569CD6"
    STRINGS      = "#CE9178"
    FONT_MONO    = "JetBrains Mono, Consolas, monospace"


class AriaIDEDesktop:
    def __init__(self):
        self.page = None
        self.current_frame_bytes = None
        self.selected_model = "flash"
        self.is_processing = False
        
        # Layout State
        self.active_activity = "files"  # files, search, git, extensions, settings
        self.left_sidebar_visible = False
        self.right_sidebar_visible = True
        
        # Editor State
        self.current_file_path = "untitled.txt"
        self.editor_text = ""
        self.tabs = ["untitled.txt"]
        
        # Components references
        self.left_sidebar_container = None
        self.right_sidebar_container = None
        self.editor_control = None
        self.line_numbers = None
        self.context_content = None # For chat context ref
        self.chat_history = ft.Column(scroll=ft.ScrollMode.AUTO, expand=True, spacing=12)
        
        self.coordinator = GeminiCoordinator()

    def _toggle_activity(self, view_name):
        if self.active_activity == view_name:
            self.left_sidebar_visible = not self.left_sidebar_visible
        else:
            self.active_activity = view_name
            self.left_sidebar_visible = True
        
        self._update_layout_state()

    def _update_layout_state(self):
        if self.page:
            self.left_sidebar_container.visible = self.left_sidebar_visible
            self.left_sidebar_container.update()
            self._update_activity_bar_styling()

    def _update_activity_bar_styling(self):
        # Implement highlighting logic if references stored
        if self.page:
            self.page.update()

    def _build_activity_bar(self):
        def icon_btn(icon, name, value):
            return ft.IconButton(
                icon,
                tooltip=name,
                icon_color=IDETheme.TEXT_MAIN if self.active_activity == value else IDETheme.TEXT_DIM,
                selected=self.active_activity == value,
                on_click=lambda e: self._toggle_activity(value),
                style=ft.ButtonStyle(
                    shape=ft.RoundedRectangleBorder(radius=0),
                    bgcolor=ft.Colors.TRANSPARENT,
                ),
            )
        
        return ft.Container(
            width=50,
            bgcolor=IDETheme.SIDEBAR,
            content=ft.Column(
                [
                    icon_btn(ft.Icons.FOLDER_OPEN, "Explorer", "files"),
                    icon_btn(ft.Icons.SEARCH, "Search", "search"),
                    icon_btn(ft.Icons.SOURCE_JOINT, "Source Control", "git"),
                    icon_btn(ft.Icons.EXTENSION, "Extensions", "extensions"),
                    ft.Container(expand=True),
                    icon_btn(ft.Icons.SETTINGS, "Settings", "settings"),
                ],
                spacing=0,
                alignment=ft.MainAxisAlignment.START,
            )
        )

    def _build_file_explorer(self):
        # Recursive file tree simulation using ExpansionTiles
        def build_tree(path, depth=0):
            try:
                items = []
                for entry in os.scandir(path):
                    if entry.name.startswith('.'): continue
                    if entry.is_dir():
                        items.append(ft.ExpansionTile(
                            title=ft.Text(entry.name, size=12, color=IDETheme.TEXT_MAIN),
                            leading=ft.Icon(ft.Icons.FOLDER, size=14, color=IDETheme.TEXT_DIM),
                            controls=build_tree(entry.path, depth+1),
                            tile_padding=ft.Padding(0,0,0,0),
                            min_height=30,
                            collapsed_text_color=IDETheme.TEXT_MAIN,
                            text_color=IDETheme.ACCENT,
                        ))
                    else:
                        items.append(ft.ListTile(
                            title=ft.Text(entry.name, size=12, color=IDETheme.TEXT_MAIN),
                            leading=ft.Icon(ft.Icons.INSERT_DRIVE_FILE_OUTLINED, size=14, color=IDETheme.TEXT_DIM),
                            dense=True,
                            content_padding=ft.Padding(left=10 + (depth*5), right=0, top=0, bottom=0),
                            height=30,
                            on_click=lambda e: print(f"Open {entry.path}"), 
                            hover_color=IDETheme.SURFACE
                        ))
                return items
            except Exception:
                return []

        # Start from current directory
        tree_root = build_tree(os.getcwd())
        
        return ft.ListView(
            controls=tree_root,
            spacing=0,
            padding=0,
        )

    def _build_left_sidebar_content(self):
        # Switch content based on active_activity
        # For now, just File Explorer is implemented fully
        return ft.Column(
            [
                ft.Container(
                    content=ft.Text("EXPLORER", size=11, weight="bold", color=IDETheme.TEXT_DIM),
                    padding=ft.Padding(12, 8)
                ),
                ft.Container(
                    content=self._build_file_explorer(),
                    expand=True,
                )
            ],
            spacing=0,
            expand=True
        )

    def _build_editor_area(self):
        # Tab Bar
        tab_bar = ft.Container(
            height=35,
            bgcolor=IDETheme.BACKGROUND,
            content=ft.Row(
                [
                    ft.Container(
                        content=ft.Row([
                            ft.Icon(ft.Icons.DESCRIPTION, size=14, color=IDETheme.ACCENT),
                            ft.Text("aria_desktop_ide.py", size=12, color=IDETheme.TEXT_MAIN),
                            ft.Icon(ft.Icons.CLOSE, size=14, color=IDETheme.TEXT_MAIN)
                        ], spacing=6, vertical_alignment=ft.CrossAxisAlignment.CENTER),
                        padding=ft.Padding(10, 5),
                        bgcolor=IDETheme.SURFACE, # Active tab
                        border=ft.Border.only(top=ft.BorderSide(2, IDETheme.ACCENT))
                    )
                ],
                spacing=1
            )
        )
        
        # Breadcrumbs
        breadcrumbs = ft.Container(
            height=22,
            content=ft.Row(
                [
                    ft.Text("aria-platform > aria_desktop_ide.py", size=11, color=IDETheme.TEXT_DIM),
                ], 
                alignment=ft.MainAxisAlignment.START
            ),
            padding=ft.Padding(left=10)
        )

        # Editor Setup
        self.line_numbers = ft.Column([], spacing=0, alignment=ft.MainAxisAlignment.START)
        
        self.editor_control = ft.TextField(
            value=self.editor_text,
            multiline=True,
            min_lines=30,
            text_size=14,
            text_style=ft.TextStyle(font_family=IDETheme.FONT_MONO, color=IDETheme.TEXT_MAIN, height=1.6),
            border_color="transparent", 
            focused_border_color="transparent",
            bgcolor="transparent", 
            cursor_color=IDETheme.ACCENT,
            content_padding=0,
            on_change=self._on_editor_change,
            expand=True,
        )

        editor_main = ft.Row(
            [
                ft.Container(content=self.line_numbers, width=40, padding=ft.Padding(top=10, right=5), allow_selection=False),
                ft.Container(content=self.editor_control, expand=True)
            ],
            expand=True,
            alignment=ft.MainAxisAlignment.START,
            vertical_alignment=ft.CrossAxisAlignment.START,
        )
        
        # Status Bar
        status_bar = ft.Container(
            height=22,
            bgcolor=IDETheme.ACCENT,
            content=ft.Row(
                [
                    ft.Container(
                        content=ft.Row([
                            ft.Icon(ft.Icons.CODE_OFF, size=12, color="white"),
                            ft.Text("main", size=11, color="white"),
                        ], spacing=4),
                        padding=ft.Padding(left=10)
                    ),
                    ft.Container(expand=True),
                    ft.Text("Ln 1, Col 1", size=11, color="white"),
                    ft.Text("UTF-8", size=11, color="white"),
                    ft.Text("Python", size=11, color="white"),
                    ft.Container(width=10)
                ],
                vertical_alignment=ft.CrossAxisAlignment.CENTER
            )
        )

        return ft.Column([tab_bar, breadcrumbs, editor_main, status_bar], spacing=0, expand=True)

    def _on_editor_change(self, e):
        # Update line numbers logic
        val = e.control.value
        lines = val.count('\n') + 1
        self.line_numbers.controls = [
            ft.Text(str(i), size=12, font_family=IDETheme.FONT_MONO, color=IDETheme.TEXT_DIM, height=22.4) # Approx height based on line height
            for i in range(1, min(lines + 1, 500)) # Cap for performance
        ]
        if self.page: self.line_numbers.update()

    def _build_chat_panel(self):
        # Header
        header = ft.Container(
            height=35, 
            padding=ft.Padding(left=10, right=10),
            content=ft.Row(
                [
                    ft.Text("CHAT", size=11, weight="bold", color=IDETheme.TEXT_MAIN),
                    ft.Row([
                        self.model_dropdown_small(),
                        ft.IconButton(ft.Icons.CLOSE, icon_size=14, icon_color=IDETheme.TEXT_DIM, on_click=lambda e: self._toggle_right_panel(False))
                    ])
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN
            )
        )
        
        # Composer
        self.chat_input = ft.TextField(
            hint_text="Ask anything... (@ to reference)",
            multiline=True,
            min_lines=1,
            max_lines=5,
            text_size=13,
            border_color=IDETheme.BORDER,
            bgcolor=IDETheme.BACKGROUND,
            border_radius=6,
            expand=True,
            content_padding=10,
            text_style=ft.TextStyle(font_family=IDETheme.FONT_MONO)
        )
        
        send_btn = ft.IconButton(
            ft.Icons.SEND_ROUNDED, 
            icon_color=IDETheme.ACCENT, 
            tooltip="Send",
            on_click=self._on_chat_submit
        )

        composer = ft.Container(
            padding=10,
            content=ft.Column([
                ft.Row([ft.IconButton(ft.Icons.ATTACH_FILE, icon_size=16, icon_color=IDETheme.TEXT_DIM), self.chat_input, send_btn]),
                ft.Text("Enter to send, Shift+Enter for new line", size=10, color=IDETheme.TEXT_DIM)
            ])
        )

        return ft.Column(
            [
                header,
                ft.Divider(height=1, color=IDETheme.BORDER),
                self.chat_history,
                ft.Divider(height=1, color=IDETheme.BORDER),
                composer
            ],
            expand=True,
            spacing=0
        )

    def model_dropdown_small(self):
        return ft.Dropdown(
            width=100,
            options=[ft.dropdown.Option("flash", "Flash 2.0"), ft.dropdown.Option("pro", "Pro 1.5")],
            value="flash",
            text_size=11,
            border_width=0,
            dense=True,
            on_change=lambda e: setattr(self, "selected_model", e.control.value)
        )

    def _toggle_right_panel(self, visible):
        self.right_sidebar_visible = visible
        if self.right_sidebar_container and self.page:
            self.right_sidebar_container.visible = visible
            self.right_sidebar_container.update()

    def _on_chat_submit(self, e):
        msg = self.chat_input.value
        if not msg: return
        
        # User Bubble
        self.chat_history.controls.append(
            ft.Container(
                content=ft.Text(msg, color=IDETheme.TEXT_MAIN, size=13),
                bgcolor=IDETheme.SURFACE_ALT,
                padding=10,
                border_radius=8,
                margin=ft.margin.only(bottom=10, left=10, right=10),
                alignment=ft.alignment.center_left
            )
        )
        self.chat_input.value = ""
        self.page.update()
        
        # Call AI (Stub)
        threading.Thread(target=self._run_ai_response, args=(msg,), daemon=True).start()

    def _run_ai_response(self, prompt):
        # Simulating streaming response
        response_container = ft.Markdown(
            value="", 
            extension_set=ft.MarkdownExtensionSet.GITHUB_WEB, 
            code_theme="atom-one-dark"
        )
        self.chat_history.controls.append(
            ft.Container(
                content=response_container,
                padding=10,
                margin=ft.margin.only(bottom=10, left=10, right=10),
            )
        )
        if self.page: self.page.update()
        
        full_resp = ""
        # Using the coordinator
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def stream():
            nonlocal full_resp
            async for chunk in self.coordinator.process_query(
                prompt,
                preferred_model=self.selected_model
            ):
                full_resp += chunk
                response_container.value = full_resp
                if self.page: self.page.update()
        
        loop.run_until_complete(stream())
        loop.close()

    def main(self, page: ft.Page):
        self.page = page
        page.title = "ARIA IDE"
        page.padding = 0
        page.theme_mode = ft.ThemeMode.DARK
        page.bgcolor = IDETheme.BACKGROUND
        page.fonts = {"Mono": IDETheme.FONT_MONO}
        
        # Init Containers
        self.left_sidebar_container = ft.Container(
            content=self._build_left_sidebar_content(),
            width=250,
            bgcolor=IDETheme.SURFACE,
            visible=self.left_sidebar_visible,
            border=ft.Border.only(right=ft.BorderSide(1, IDETheme.BORDER))
        )
        
        self.right_sidebar_container = ft.Container(
            content=self._build_chat_panel(),
            width=400,
            bgcolor=IDETheme.SURFACE,
            visible=self.right_sidebar_visible,
            border=ft.Border.only(left=ft.BorderSide(1, IDETheme.BORDER))
        )
        
        # Main Layout
        page.add(
            ft.Row(
                [
                    self._build_activity_bar(),
                    self.left_sidebar_container,
                    self._build_editor_area(),
                    self.right_sidebar_container
                ],
                expand=True,
                spacing=0
            ) 
        )

if __name__ == "__main__":
    app = AriaIDEDesktop()
    ft.run(app.main)
