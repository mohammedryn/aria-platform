"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureImage = captureImage;
const vscode = require("vscode");
const fs = require("fs");
const ariaPanel_1 = require("../panels/ariaPanel");
const cameraPanel_1 = require("../panels/cameraPanel");
const cameraBridge_1 = require("../vision/cameraBridge");
async function captureImage() {
    const choice = await vscode.window.showQuickPick(['Open Camera (Python Native - Pro)', 'Open Camera (External Browser)', 'Select Image File...'], { placeHolder: 'How do you want to provide the hardware image?' });
    if (!choice)
        return;
    if (choice === 'Open Camera (Python Native - Pro)') {
        try {
            if (!ariaPanel_1.AriaPanel.currentPanel) {
                await vscode.commands.executeCommand('aria.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            // Launch Python Bridge
            // Note: We need to pass a callback to update the UI with the stream URL
            const base64 = await cameraBridge_1.CameraBridge.capture('native-python', (url) => {
                if (ariaPanel_1.AriaPanel.currentPanel) {
                    // We reuse the 'showStream' command because the Python server
                    // provides the exact same API (/stream, /trigger) as the Node.js bridge!
                    ariaPanel_1.AriaPanel.currentPanel['_panel'].webview.postMessage({ command: 'showStream', url: url });
                }
            });
            if (base64 && ariaPanel_1.AriaPanel.currentPanel) {
                await ariaPanel_1.AriaPanel.currentPanel.analyzeImage(base64);
            }
        }
        catch (e) {
            vscode.window.showErrorMessage("Python Bridge Failed: " + e);
        }
        return;
    }
    if (choice === 'Open Camera (Integrated - Simple Browser)') {
        const base64 = await cameraBridge_1.CameraBridge.capture('embedded');
        if (base64) {
            if (!ariaPanel_1.AriaPanel.currentPanel) {
                await vscode.commands.executeCommand('aria.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (ariaPanel_1.AriaPanel.currentPanel) {
                await ariaPanel_1.AriaPanel.currentPanel.analyzeImage(base64);
            }
        }
        return;
    }
    if (choice === 'Open Camera (External Browser)') {
        const base64 = await cameraBridge_1.CameraBridge.capture('external');
        if (base64) {
            if (!ariaPanel_1.AriaPanel.currentPanel) {
                await vscode.commands.executeCommand('aria.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (ariaPanel_1.AriaPanel.currentPanel) {
                await ariaPanel_1.AriaPanel.currentPanel.analyzeImage(base64);
            }
        }
        return;
    }
    if (choice === 'Open Camera (Built-in Webview)') {
        cameraPanel_1.CameraPanel.createOrShow(vscode.extensions.getExtension('Ranch-Hand-Robotics.aria-vscode').extensionUri);
        return;
    }
    // Default: File Select
    // Ensure main panel is open for file analysis results
    if (!ariaPanel_1.AriaPanel.currentPanel) {
        await vscode.commands.executeCommand('aria.openPanel');
        // Give it a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'Images': ['png', 'jpg', 'jpeg']
        },
        openLabel: 'Analyze Hardware'
    });
    if (uris && uris.length > 0) {
        try {
            const fileContent = fs.readFileSync(uris[0].fsPath);
            const base64 = fileContent.toString('base64');
            if (ariaPanel_1.AriaPanel.currentPanel) {
                await ariaPanel_1.AriaPanel.currentPanel.analyzeImage(base64);
            }
            else {
                vscode.window.showErrorMessage("A.R.I.A Panel failed to open.");
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Failed to read image: ${e}`);
        }
    }
}
//# sourceMappingURL=captureImage.js.map