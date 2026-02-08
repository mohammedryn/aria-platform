# A.R.I.A. – Hardware-Aware IDE Copilot

A.R.I.A. (Autonomous Reasoning & Interface Agent) is a hardware-aware IDE copilot designed for professional engineering. It integrates seamlessly into VS Code to provide intelligent assistance, code analysis, and eventually, hardware simulation and control capabilities.

## Quick Start (For Judges)

1.  **Install/Run**: Open this folder in VS Code, run `npm install`, then press `F5` to launch the Extension Development Host.
2.  **Set API Key**:
    *   Press `Ctrl+Shift+P` and run **A.R.I.A: Set API Key**.
    *   Paste the **Testing Login (API Key)** provided in the submission form.
3.  **Test Camera**:
    *   Run **A.R.I.A: Capture Hardware Image**.
    *   Select **Native Python**.
    *   Click **Capture** to analyze your hardware.

## Installation

1. Open this folder in VS Code.
2. Run `npm install` to install dependencies.
3. Press `F5` to start debugging the extension.

## Current Features (Foundation)

- **Activation**: The extension activates automatically on startup or command execution.
- **A.R.I.A. Copilot Panel**: A dedicated webview panel for future AI interactions.
- **Status Bar Integration**: A status bar item ("A.R.I.A ● Ready") provides quick access to the copilot.
- **Context Awareness**: The extension passively monitors and logs the active file and user selections to the "A.R.I.A Logs" output channel.

## Roadmap

- **AI Integration**: Embedded Gemini 3.0 reasoning engine.
- **Hardware Link**: Direct integration with PlatformIO and physical hardware sensors.
- **Simulation**: Wokwi-based circuit simulation within the IDE.

---
*Professional Tooling. No Hype.*
