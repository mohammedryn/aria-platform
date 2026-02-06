# A.R.I.A. – Hardware-Aware IDE Copilot

A.R.I.A. (Autonomous Reasoning & Interface Agent) is a hardware-aware IDE copilot designed for professional engineering. It integrates seamlessly into VS Code to provide intelligent assistance, code analysis, and eventually, hardware simulation and control capabilities.

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
