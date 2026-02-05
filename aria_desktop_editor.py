"""
Modern code editor layout: VS Code / Monaco-style.
Three panels: left activity bar (50px), center editor (70%), right AI chat (30%, collapsible).
Includes: file explorer, command palette, terminal, find/replace, Apply/Copy/Regenerate on AI code.
"""
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, message=".*generativeai.*")
warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*symmetric.*")

import flet as ft
import re
import threading
import sys
import os
import asyncio

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from src.core.coordinator import GeminiCoordinator

# --- Exact color palette from spec ---
class EditorTheme:
    BG_PRIMARY   = "#1e1e1e"
    BG_SECONDARY = "#252526"
    SIDEBAR      = "#333333"
    ACCENT       = "#007ACC"
    TEXT         = "#CCCCCC"
    COMMENT      = "#6A9955"
    KEYWORD      = "#569CD6"
    STRING       = "#CE9178"
    FONT_MONO    = "JetBrains Mono, Fira Code, Consolas, monospace"
    FONT_UI      = "Segoe UI, system-ui, sans-serif"
    EDITOR_FONT_SIZE = 14
    UI_FONT_SIZE = 13
    LINE_HEIGHT_CODE = 1.6
    LINE_HEIGHT_UI   = 1.4


def _icon_btn(icon: str, tooltip: str, active: bool, on_click):
    return ft.IconButton(
        icon=icon,
        icon_size=22,
        icon_color=EditorTheme.ACCENT if active else EditorTheme.TEXT,
        tooltip=tooltip,
        on_click=on_click,
        style=ft.ButtonStyle(
            shape=ft.RoundedRectangleBorder(radius=0),
            bgcolor=EditorTheme.ACCENT + "20" if active else ft.Colors.TRANSPARENT,
            overlay_color=ft.Colors.WHITE12,
        ),
    )


class AriaEditorDesktop:
    def __init__(self):
        self.page = None
        self.coordinator = GeminiCoordinator()
        # Activity bar: 0=explorer, 1=search, 2=source, 3=extensions, 4=settings
        self.active_sidebar_icon = 0
        self.chat_panel_visible = True
        self.chat_minimized = False  # when True, chat is a thin strip
        self.terminal_visible = False
        self.find_visible = False
        self.command_palette_visible = False
        self.explorer_visible = True  # file explorer open when icon 0 active
        self.is_processing = False
        self.selected_model = "flash"
        self.editor_text = ""
        self.open_tabs = [{"id": "untitled-1", "label": "Untitled-1", "path": None}]
        self.current_tab_id = "untitled-1"
        self.language_mode = "Plain Text"
        self.encoding = "UTF-8"
        self.git_branch = "main"
        self.chat_messages = []  # list of {"role": "user"|"assistant", "content": str}
        self._refs = {}  # for dynamic updates

        # Build core controls
        self._build_activity_bar()
        self._build_editor_center()
        self._build_chat_panel()
        self._build_file_explorer()
        self._build_command_palette()
        self._build_terminal()
        self._build_find_replace()
        self._build_status_bar()

    def _build_activity_bar(self):
        def make_click(i):
            def _click(e):
                self.active_sidebar_icon = i
                self._refresh_activity_bar()
                if i == 0:
                    self.explorer_visible = True
                    if self._refs.get("explorer_panel"):
                        self._refs["explorer_panel"].visible = True
                        self.page.update()
            return _click

        self._activity_icons = [
            _icon_btn(ft.Icons.FOLDER_OPEN, "Explorer (Ctrl+Shift+E)", True, make_click(0)),
            _icon_btn(ft.Icons.SEARCH, "Search (Ctrl+Shift+F)", False, make_click(1)),
            _icon_btn(ft.Icons.SOURCE, "Source Control (Ctrl+Shift+G)", False, make_click(2)),
            _icon_btn(ft.Icons.EXTENSION, "Extensions (Ctrl+Shift+X)", False, make_click(3)),
            _icon_btn(ft.Icons.SETTINGS, "Settings (Ctrl+,)", False, make_click(4)),
        ]
        self.activity_bar = ft.Container(
            width=50,
            bgcolor=EditorTheme.SIDEBAR,
            content=ft.Column(
                [
                    self._activity_icons[0],
                    self._activity_icons[1],
                    self._activity_icons[2],
                    self._activity_icons[3],
                    ft.Container(expand=True),
                    self._activity_icons[4],
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=0,
            ),
            border=ft.Border.only(right=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )

    def _refresh_activity_bar(self):
        for i, btn in enumerate(self._activity_icons):
            btn.icon_color = EditorTheme.ACCENT if i == self.active_sidebar_icon else EditorTheme.TEXT
            btn.style.bgcolor = (EditorTheme.ACCENT + "20") if i == self.active_sidebar_icon else ft.Colors.TRANSPARENT
            btn.update()

    def _build_editor_center(self):
        # Line numbers
        self.line_numbers = ft.Text(
            "1",
            size=EditorTheme.EDITOR_FONT_SIZE,
            font_family=EditorTheme.FONT_MONO,
            color=EditorTheme.TEXT,
            selectable=False,
        )
        self.code_editor = ft.TextField(
            value="",
            multiline=True,
            min_lines=1,
            text_size=EditorTheme.EDITOR_FONT_SIZE,
            text_style=ft.TextStyle(
                font_family=EditorTheme.FONT_MONO,
                color=EditorTheme.TEXT,
            ),
            border_color="transparent",
            focused_border_color="transparent",
            bgcolor="transparent",
            cursor_color=EditorTheme.ACCENT,
            cursor_width=2,
        )
        self.code_editor.on_change = self._on_editor_change

        ln_col = ft.Container(
            content=self.line_numbers,
            width=52,
            padding=ft.Padding.only(left=12, right=8, top=8, bottom=8),
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(right=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )
        editor_col = ft.Container(content=self.code_editor, expand=True, padding=8)
        # Minimap: code overview strip (mini representation of line count / shape)
        self.minimap_text = ft.Text(
            "",
            size=2,
            font_family=EditorTheme.FONT_MONO,
            color=EditorTheme.TEXT + "40",
            no_wrap=False,
            selectable=False,
        )
        self._refs["minimap_text"] = self.minimap_text
        minimap = ft.Container(
            content=ft.Column(
                [
                    ft.Container(height=4),
                    ft.Container(content=self.minimap_text, expand=True, padding=ft.Padding.only(left=2, right=2)),
                ],
                expand=True,
            ),
            width=50,
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(left=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )
        self._refs["minimap"] = minimap
        editor_row = ft.Row([ln_col, editor_col, minimap], expand=True, spacing=0)

        # Tab bar (active tab: top accent border)
        self._tab_untitled = ft.Container(
            content=ft.Row(
                [
                    ft.Text("Untitled-1", size=EditorTheme.UI_FONT_SIZE, color=EditorTheme.TEXT),
                    ft.IconButton(ft.Icons.CLOSE, icon_size=14, icon_color=EditorTheme.TEXT, on_click=lambda e: None),
                ],
                spacing=4,
                tight=True,
            ),
            bgcolor=EditorTheme.BG_PRIMARY,
            padding=ft.Padding.symmetric(horizontal=12, vertical=8),
            border=ft.Border.only(top=ft.BorderSide(2, EditorTheme.ACCENT), right=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )
        self.tab_bar = ft.Row(
            [self._tab_untitled],
            scroll=ft.ScrollMode.AUTO,
            spacing=0,
        )
        # Breadcrumb (Monaco-style: file path with chevrons, clearly visible)
        self.breadcrumb = ft.Row(
            [
                ft.Icon(ft.Icons.CHEVRON_RIGHT, size=14, color=EditorTheme.TEXT),
                ft.Text("Untitled-1", size=12, color=EditorTheme.TEXT),
            ],
            spacing=4,
            wrap=True,
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        )
        breadcrumb_bar = ft.Container(
            content=self.breadcrumb,
            padding=ft.Padding.symmetric(horizontal=12, vertical=6),
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(bottom=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )

        self.center_panel = ft.Container(
            content=ft.Column(
                [
                    self.tab_bar,
                    breadcrumb_bar,
                    ft.Container(content=editor_row, expand=True),
                ],
                expand=True,
                spacing=0,
            ),
            expand=True,
            bgcolor=EditorTheme.BG_PRIMARY,
        )

    def _build_status_bar(self):
        self.status_line_col = ft.Text("Ln 1, Col 1", size=EditorTheme.UI_FONT_SIZE - 1, color=EditorTheme.TEXT)
        self.status_lang = ft.Text(self.language_mode, size=EditorTheme.UI_FONT_SIZE - 1, color=EditorTheme.TEXT)
        self.status_encoding = ft.Text(self.encoding, size=EditorTheme.UI_FONT_SIZE - 1, color=EditorTheme.TEXT)
        self.status_git = ft.Text(f"  {self.git_branch}  ", size=EditorTheme.UI_FONT_SIZE - 1, color=EditorTheme.TEXT)
        self._status_terminal_btn = ft.IconButton(
            ft.Icons.TERMINAL,
            icon_size=16,
            icon_color=EditorTheme.TEXT,
            tooltip="Toggle Terminal (Ctrl+`)",
            on_click=lambda e: self._toggle_terminal_from_status(),
        )
        self.status_bar = ft.Container(
            content=ft.Row(
                [
                    self.status_line_col,
                    ft.Container(width=1, height=14, bgcolor=EditorTheme.BG_PRIMARY),
                    self.status_lang,
                    ft.Container(width=1, height=14, bgcolor=EditorTheme.BG_PRIMARY),
                    self.status_encoding,
                    ft.Container(expand=True),
                    self._status_terminal_btn,
                    self.status_git,
                ],
                spacing=8,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=ft.Padding.symmetric(horizontal=8, vertical=2),
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(top=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )

    def _build_chat_panel(self):
        self.model_dropdown = ft.Dropdown(
            width=100,
            value="flash",
            options=[ft.dropdown.Option("flash", "Flash"), ft.dropdown.Option("pro", "Pro")],
            text_size=EditorTheme.UI_FONT_SIZE - 1,
            border_color=EditorTheme.BG_SECONDARY,
            bgcolor=EditorTheme.BG_PRIMARY,
        )
        self.model_dropdown.on_change = lambda e: setattr(self, "selected_model", e.control.value or "flash")

        chat_header = ft.Container(
            content=ft.Row(
                [
                    ft.Text("Chat", size=EditorTheme.UI_FONT_SIZE, weight="bold", color=EditorTheme.TEXT),
                    ft.Container(expand=True),
                    self.model_dropdown,
                    ft.IconButton(ft.Icons.REMOVE, icon_size=18, icon_color=EditorTheme.TEXT, tooltip="Minimize", on_click=self._toggle_chat),
                    ft.IconButton(ft.Icons.CLOSE, icon_size=18, icon_color=EditorTheme.TEXT, tooltip="Close", on_click=self._close_chat),
                ],
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=ft.Padding.symmetric(horizontal=12, vertical=8),
            border=ft.Border.only(bottom=ft.BorderSide(1, EditorTheme.BG_SECONDARY)),
            bgcolor=EditorTheme.BG_SECONDARY,
        )

        self.chat_message_list = ft.ListView(
            expand=True,
            padding=12,
            spacing=12,
            auto_scroll=True,
        )

        self.chat_input = ft.TextField(
            multiline=True,
            min_lines=1,
            max_lines=6,
            hint_text="Type a message... Use @ to reference files",
            text_size=EditorTheme.UI_FONT_SIZE,
            border_color=EditorTheme.BG_SECONDARY,
            focused_border_color=EditorTheme.ACCENT,
            bgcolor=EditorTheme.BG_PRIMARY,
            cursor_color=EditorTheme.ACCENT,
            border_radius=8,
            content_padding=ft.Padding.symmetric(horizontal=12, vertical=10),
        )
        attach_btn = ft.IconButton(ft.Icons.ATTACH_FILE, icon_size=20, icon_color=EditorTheme.TEXT, tooltip="Attach file")
        send_btn = ft.IconButton(
            ft.Icons.ARROW_UPWARD,
            icon_size=20,
            icon_color=EditorTheme.ACCENT,
            tooltip="Send",
            on_click=self._on_send_chat,
        )
        composer = ft.Container(
            content=ft.Row(
                [attach_btn, ft.Container(content=self.chat_input, expand=True), send_btn],
                vertical_alignment=ft.CrossAxisAlignment.END,
                spacing=4,
            ),
            padding=8,
            border=ft.Border.only(top=ft.BorderSide(1, EditorTheme.BG_SECONDARY)),
            bgcolor=EditorTheme.BG_SECONDARY,
        )
        self.chat_input.on_submit = lambda e: self._on_send_chat(e)

        self._chat_full_content = ft.Column(
            [chat_header, self.chat_message_list, composer],
            expand=True,
        )
        self._chat_minimized_content = ft.Container(
            content=ft.Column(
                [
                    ft.Container(expand=True),
                    ft.Text("Chat", size=11, color=EditorTheme.TEXT),
                    ft.IconButton(ft.Icons.CHEVRON_LEFT, icon_size=18, icon_color=EditorTheme.ACCENT, tooltip="Expand chat", on_click=self._expand_chat),
                    ft.Container(expand=True),
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=4,
            ),
            alignment=ft.Alignment(0.5, 0.5),
            bgcolor=EditorTheme.BG_SECONDARY,
        )
        self.chat_panel = ft.Container(
            content=self._chat_full_content,
            width=0,
            visible=False,
            border=ft.Border.only(left=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
            bgcolor=EditorTheme.BG_SECONDARY,
            animate=ft.Animation(200, ft.AnimationCurve.EASE_OUT),
        )
        self._refs["chat_panel"] = self.chat_panel

    def _toggle_chat(self, e):
        """Minimize chat to thin strip (or expand if already minimized)."""
        if self.chat_minimized:
            self._expand_chat(e)
            return
        self.chat_minimized = True
        self.chat_panel.content = self._chat_minimized_content
        self.chat_panel.width = 48
        self.chat_panel.visible = True
        if self.page:
            self.page.update()

    def _expand_chat(self, e):
        self.chat_minimized = False
        self.chat_panel.content = self._chat_full_content
        self.chat_panel.width = int((self.page.width or 1200) * 0.30)
        if self.page:
            self.page.update()

    def _close_chat(self, e):
        self.chat_panel_visible = False
        self.chat_minimized = False
        self.chat_panel.content = self._chat_full_content
        self.chat_panel.visible = False
        self.chat_panel.width = 0
        self.page.update()

    def _build_file_explorer(self):
        # Sample tree: EXPLORER placeholder with one folder
        def add_item(name, is_folder=True, children=None):
            icon = ft.Icons.FOLDER if is_folder else ft.Icons.DESCRIPTION
            if is_folder and children:
                return ft.ExpansionTile(
                    title=ft.Row([ft.Icon(icon, size=16, color=EditorTheme.TEXT), ft.Text(name, size=EditorTheme.UI_FONT_SIZE, color=EditorTheme.TEXT)], spacing=6),
                    controls=[ft.Container(content=c, padding=ft.Padding.only(left=20)) for c in children],
                )
            return ft.ListTile(
                leading=ft.Icon(icon, size=16, color=EditorTheme.TEXT),
                title=ft.Text(name, size=EditorTheme.UI_FONT_SIZE, color=EditorTheme.TEXT),
                on_click=lambda e, n=name: self._open_file_from_explorer(n),
            )

        tree = ft.Column(
            [
                ft.Container(ft.Text("EXPLORER", size=10, weight="bold", color=EditorTheme.TEXT), padding=8),
                add_item("src", True, [
                    add_item("main.py", False),
                    add_item("config.py", False),
                ]),
                add_item("README.md", False),
            ],
            spacing=0,
        )
        self.explorer_panel = ft.Container(
            content=ft.Column([tree], scroll=ft.ScrollMode.AUTO, expand=True),
            width=220,
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(right=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )
        self._refs["explorer_panel"] = self.explorer_panel

    def _open_file_from_explorer(self, name):
        self.breadcrumb.controls = [
            ft.Icon(ft.Icons.CHEVRON_RIGHT, size=14, color=EditorTheme.TEXT),
            ft.Text(name, size=12, color=EditorTheme.TEXT),
        ]
        self.breadcrumb.update()
        self.page.update()

    def _build_command_palette(self):
        self.command_palette_input = ft.TextField(
            hint_text="Type a command or search...",
            text_size=EditorTheme.UI_FONT_SIZE,
            border_color=EditorTheme.ACCENT,
            bgcolor=EditorTheme.BG_SECONDARY,
            width=500,
            on_change=self._on_command_palette_filter,
        )
        self.command_list = ft.Column(
            [
                ft.ListTile(title=ft.Text("Toggle Terminal", size=EditorTheme.UI_FONT_SIZE), on_click=lambda e: self._run_command("terminal")),
                ft.ListTile(title=ft.Text("Toggle Chat", size=EditorTheme.UI_FONT_SIZE), on_click=lambda e: self._run_command("chat")),
                ft.ListTile(title=ft.Text("Find (Ctrl+F)", size=EditorTheme.UI_FONT_SIZE), on_click=lambda e: self._run_command("find")),
                ft.ListTile(title=ft.Text("Go to Line...", size=EditorTheme.UI_FONT_SIZE), on_click=lambda e: self._run_command("goto")),
            ],
            scroll=ft.ScrollMode.AUTO,
            height=200,
        )
        self.command_palette = ft.Container(
            content=ft.Column(
                [
                    ft.Container(content=self.command_palette_input, padding=8),
                    ft.Container(content=self.command_list, padding=ft.Padding.only(bottom=8)),
                ],
                width=500,
            ),
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.all(2, EditorTheme.ACCENT),
            border_radius=8,
            padding=0,
            visible=False,
        )
        self._refs["command_palette"] = self.command_palette

    def _on_command_palette_filter(self, e):
        pass  # fuzzy filter could go here

    def _toggle_terminal_from_status(self):
        self.terminal_visible = not self.terminal_visible
        self._refs["terminal_panel"].visible = self.terminal_visible
        self._status_terminal_btn.icon_color = EditorTheme.ACCENT if self.terminal_visible else EditorTheme.TEXT
        self._status_terminal_btn.update()
        if self.page:
            self.page.update()

    def _run_command(self, cmd):
        self.command_palette_visible = False
        self.command_palette.visible = False
        ov = self._refs.get("command_palette_overlay")
        if ov:
            ov.visible = False
        if cmd == "terminal":
            self._toggle_terminal_from_status()
        elif cmd == "chat":
            self.chat_panel_visible = not self.chat_panel_visible
            self.chat_panel.visible = self.chat_panel_visible
            self.chat_panel.width = (self.page.width * 0.30) if self.chat_panel_visible else 0
        elif cmd == "find":
            self.find_visible = True
            self._refs["find_panel"].visible = True
        self.page.update()

    def _build_terminal(self):
        self.terminal_output = ft.TextField(
            value="",
            multiline=True,
            read_only=True,
            text_size=12,
            border_color="transparent",
            bgcolor=EditorTheme.BG_PRIMARY,
        )
        term_header = ft.Container(
            content=ft.Row(
                [ft.Text("TERMINAL", size=10, weight="bold", color=EditorTheme.TEXT), ft.Dropdown(width=120, value="pwsh", options=[ft.dropdown.Option("pwsh", "PowerShell")], text_size=11)],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            ),
            padding=6,
            border=ft.Border.only(bottom=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
        )
        self.terminal_panel = ft.Container(
            content=ft.Column([term_header, ft.Container(content=self.terminal_output, expand=True)], height=200, expand=False),
            visible=False,
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(top=ft.BorderSide(1, EditorTheme.ACCENT)),
        )
        self._refs["terminal_panel"] = self.terminal_panel

    def _build_find_replace(self):
        self.find_input = ft.TextField(hint_text="Find", width=200, text_size=EditorTheme.UI_FONT_SIZE, dense=True)
        self.replace_input = ft.TextField(hint_text="Replace", width=200, text_size=EditorTheme.UI_FONT_SIZE, dense=True)
        find_bar = ft.Row(
            [
                self.find_input,
                self.replace_input,
                ft.IconButton(ft.Icons.CHECK, icon_size=18, tooltip="Replace"),
                ft.IconButton(ft.Icons.CLOSE, icon_size=18, tooltip="Close", on_click=self._close_find),
            ],
            spacing=4,
        )
        self.find_panel = ft.Container(
            content=find_bar,
            padding=6,
            bgcolor=EditorTheme.BG_SECONDARY,
            border=ft.Border.only(bottom=ft.BorderSide(1, EditorTheme.BG_PRIMARY)),
            visible=False,
        )
        self._refs["find_panel"] = self.find_panel

    def _on_editor_change(self, e):
        self.editor_text = (e.control.value or "") if e and getattr(e, "control", None) else (self.code_editor.value or "")
        self._update_line_numbers()

    def _update_line_numbers(self):
        lines = (self.editor_text or self.code_editor.value or "").splitlines()
        n = max(1, len(lines))
        self.line_numbers.value = "\n".join(str(i) for i in range(1, n + 1))
        self.line_numbers.update()
        self.status_line_col.value = f"Ln {n}, Col 1"
        self.status_line_col.update()
        # Minimap: one char per line (first non-space or dot) for code shape
        minimap_lines = []
        for line in lines[:400]:  # cap for performance
            s = (line.strip() or " ")[:1]
            minimap_lines.append(s if s else ".")
        mt = self._refs.get("minimap_text")
        if mt:
            mt.value = "\n".join(minimap_lines) if minimap_lines else "1"
            mt.update()

    def _add_chat_message(self, role: str, content: str):
        """Append a message and render it with code block buttons (Copy, Apply)."""
        self.chat_messages.append({"role": role, "content": content})
        # Build UI for this message
        if role == "user":
            self.chat_message_list.controls.append(
                ft.Container(
                    content=ft.Text(content, size=EditorTheme.UI_FONT_SIZE, color=EditorTheme.TEXT),
                    alignment=ft.alignment.center_left,
                    bgcolor=EditorTheme.BG_PRIMARY,
                    padding=10,
                    border_radius=6,
                )
            )
        else:
            # Parse code blocks and add Copy + Apply
            parts = re.split(r"(```[\w]*\n.*?```)", content, flags=re.DOTALL)
            row_controls = []
            for part in parts:
                if part.startswith("```"):
                    match = re.match(r"```(\w*)\n?(.*)```", part, re.DOTALL)
                    code = (match.group(2) or "").strip() if match else part
                    lang = (match.group(1) or "").strip() if match else ""
                    row_controls.append(
                        ft.Container(
                            content=ft.Column(
                                [
                                    ft.Container(
                                        content=ft.Row(
                                            [
                                                ft.Text(code[:200] + ("..." if len(code) > 200 else ""), size=12, font_family=EditorTheme.FONT_MONO, color=EditorTheme.STRING, no_wrap=False),
                                                ft.Row(
                                                    [
                                                        ft.TextButton("Copy", on_click=lambda e, c=code: self._copy_code(c)),
                                                        ft.TextButton("Apply", on_click=lambda e, c=code: self._apply_code(c)),
                                                    ],
                                                ),
                                            ],
                                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                        ),
                                        padding=8,
                                        bgcolor=EditorTheme.BG_PRIMARY,
                                        border_radius=4,
                                    ),
                                ],
                                tight=True,
                            ),
                        )
                    )
                else:
                    row_controls.append(ft.Markdown(part, extension_set=ft.MarkdownExtensionSet.GITHUB_WEB, selectable=True, code_theme="atom-one-dark"))
            self.chat_message_list.controls.append(
                ft.Container(
                    content=ft.Column(row_controls, spacing=6),
                    alignment=ft.alignment.center_left,
                    padding=10,
                )
            )
            # Regenerate button for last assistant message
            self.chat_message_list.controls.append(
                ft.Row([ft.TextButton("Regenerate", on_click=lambda e: self._regenerate_last())], alignment=ft.MainAxisAlignment.END)
            )
        self.chat_message_list.update()
        if self.page:
            self.page.update()

    def _copy_code(self, code: str):
        if self.page:
            self.page.set_clipboard(code)
            self.status_line_col.value = "Copied to clipboard"
            self.status_line_col.update()
            self.page.update()

    def _apply_code(self, code: str):
        self.code_editor.value = (self.code_editor.value or "") + "\n" + code
        self.code_editor.update()
        self.editor_text = self.code_editor.value or ""
        self._update_line_numbers()
        if self.page:
            self.page.update()

    def _regenerate_last(self):
        if not self.chat_messages:
            return
        last_user = None
        for i in range(len(self.chat_messages) - 1, -1, -1):
            if self.chat_messages[i]["role"] == "user":
                last_user = self.chat_messages[i]["content"]
                break
        if last_user:
            self._send_to_ai(last_user)

    def _on_send_chat(self, e):
        msg = (self.chat_input.value or "").strip()
        if not msg or self.is_processing:
            return
        self.chat_input.value = ""
        self.chat_input.update()
        self._add_chat_message("user", msg)
        self._send_to_ai(msg)

    def _send_to_ai(self, user_msg: str):
        self.is_processing = True
        context = self.editor_text or ""
        prompt = f"{user_msg}\n\nCurrent editor content:\n```\n{context[:6000]}\n```" if context else user_msg

        def run():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                async def stream():
                    full = ""
                    async for chunk in self.coordinator.process_query(
                        prompt, image_data=None, log_callback=None, preferred_model=self.selected_model
                    ):
                        full += chunk
                        # Update last message in place for streaming
                        if self.chat_messages and self.chat_messages[-1]["role"] == "assistant":
                            self.chat_messages[-1]["content"] = full
                        else:
                            self.chat_messages.append({"role": "assistant", "content": full})
                        if self.page:
                            self._refresh_chat_messages()
                            self.page.update()
                    self.is_processing = False
                    if self.page:
                        self.page.update()
                loop.run_until_complete(stream())
            finally:
                loop.close()

        # Add placeholder assistant message
        self.chat_messages.append({"role": "assistant", "content": ""})
        self._refresh_chat_messages()
        threading.Thread(target=run, daemon=True).start()
        if self.page:
            self.page.update()

    def _refresh_chat_messages(self):
        """Re-build chat list from self.chat_messages (e.g. for streaming)."""
        self.chat_message_list.controls.clear()
        for m in self.chat_messages:
            if m["role"] == "user":
                self.chat_message_list.controls.append(
                    ft.Container(
                        content=ft.Text(m["content"], size=EditorTheme.UI_FONT_SIZE, color=EditorTheme.TEXT),
                        alignment=ft.alignment.center_left,
                        bgcolor=EditorTheme.BG_PRIMARY,
                        padding=10,
                        border_radius=6,
                    )
                )
            else:
                content = m["content"]
                if not content:
                    self.chat_message_list.controls.append(ft.Container(content=ft.ProgressRing(width=20, height=20), padding=10))
                    continue
                parts = re.split(r"(```[\w]*\n.*?```)", content, flags=re.DOTALL)
                row_controls = []
                for part in parts:
                    if part.startswith("```"):
                        match = re.match(r"```(\w*)\n?(.*)```", part, re.DOTALL)
                        code = (match.group(2) or "").strip() if match else part
                        code_preview = code[:300] + ("..." if len(code) > 300 else "")
                        row_controls.append(
                            ft.Container(
                                content=ft.Row(
                                    [
                                        ft.Container(expand=True, content=ft.Text(code_preview, size=12, font_family=EditorTheme.FONT_MONO, color=EditorTheme.STRING, no_wrap=False)),
                                        ft.TextButton("Copy", on_click=lambda e, c=code: self._copy_code(c)),
                                        ft.TextButton("Apply", on_click=lambda e, c=code: self._apply_code(c)),
                                    ]
                                ),
                                padding=8,
                                bgcolor=EditorTheme.BG_PRIMARY,
                                border_radius=4,
                            )
                        )
                    else:
                        row_controls.append(ft.Markdown(part, extension_set=ft.MarkdownExtensionSet.GITHUB_WEB, selectable=True, code_theme="atom-one-dark"))
                self.chat_message_list.controls.append(ft.Container(content=ft.Column(row_controls, spacing=6), padding=10))
                if content and not self.is_processing:
                    self.chat_message_list.controls.append(
                        ft.Row([ft.TextButton("Regenerate", on_click=lambda e: self._regenerate_last())], alignment=ft.MainAxisAlignment.END)
                    )
        self.chat_message_list.update()

    def _close_find(self, e):
        self.find_visible = False
        self.find_panel.visible = False
        if self.page:
            self.page.update()

    def _on_key(self, e: ft.KeyboardEvent):
        key = (e.key or "").upper()
        ctrl = getattr(e, "ctrl", False) or getattr(e, "control", False)
        shift = getattr(e, "shift", False)
        if ctrl and shift and key == "P":
            self.command_palette_visible = not self.command_palette_visible
            self.command_palette.visible = self.command_palette_visible
            ov = self._refs.get("command_palette_overlay")
            if ov:
                ov.visible = self.command_palette_visible
            if self.command_palette_visible:
                self.command_palette_input.focus()
            self.page.update()
        if ctrl and key == "F":
            self.find_visible = not self.find_visible
            self.find_panel.visible = self.find_visible
            self.page.update()
        # Ctrl+` toggle terminal
        if ctrl and (key == "`" or key == "~"):
            self._toggle_terminal_from_status()

    def main(self, page: ft.Page):
        self.page = page
        page.title = "ARIA — Code Editor"
        page.theme_mode = ft.ThemeMode.DARK
        page.bgcolor = EditorTheme.BG_PRIMARY
        page.padding = 0
        page.fonts = {"Mono": EditorTheme.FONT_MONO}
        page.theme = ft.Theme(font_family="Mono")
        page.on_keyboard_event = self._on_key

        # Chat panel starts visible at 30% width
        try:
            chat_width = int(page.width * 0.30) if page.width else 360
        except Exception:
            chat_width = 360
        self.chat_panel.width = chat_width
        self.chat_panel.visible = self.chat_panel_visible

        # Center content: optional explorer + editor + optional terminal
        center_content = ft.Row(
            [
                self.explorer_panel,
                ft.Container(
                    content=ft.Column(
                        [
                            ft.Row([self.center_panel], expand=True),
                            self.status_bar,
                            self.terminal_panel,
                        ],
                        expand=True,
                    ),
                    expand=True,
                ),
            ],
            expand=True,
            spacing=0,
        )

        # Overlay stack: main content + find + command palette
        main_col = ft.Column(
            [
                ft.Row(
                    [self.activity_bar, center_content, self.chat_panel],
                    expand=True,
                    spacing=0,
                ),
                self.find_panel,
            ],
            expand=True,
        )

        command_palette_overlay = ft.Container(
            content=ft.Row(
                [
                    ft.Container(expand=True),
                    ft.Container(content=self.command_palette, alignment=ft.Alignment(0.5, 0.5)),
                    ft.Container(expand=True),
                ],
                expand=True,
            ),
            alignment=ft.Alignment(0.5, 0.5),
            visible=self.command_palette_visible,
            bgcolor="#80000000",
        )
        self._refs["command_palette_overlay"] = command_palette_overlay
        overlay = ft.Stack([main_col, command_palette_overlay], expand=True)
        page.add(overlay)
        self.find_panel.visible = self.find_visible
        self.editor_text = self.code_editor.value or ""
        self._update_line_numbers()


if __name__ == "__main__":
    app = AriaEditorDesktop()
    ft.run(app.main)
