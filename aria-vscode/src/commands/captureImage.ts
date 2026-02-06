import * as vscode from 'vscode';
import * as fs from 'fs';
import { AriaPanel } from '../panels/ariaPanel';
import { CameraPanel } from '../panels/cameraPanel';
import { CameraBridge } from '../vision/cameraBridge';

export async function captureImage() {
    const choice = await vscode.window.showQuickPick(
        ['Open Camera (Python Native - Pro)', 'Open Camera (External Browser)', 'Select Image File...'],
        { placeHolder: 'How do you want to provide the hardware image?' }
    );

    if (!choice) return;

    if (choice === 'Open Camera (Python Native - Pro)') {
        try {
             if (!AriaPanel.currentPanel) {
                await vscode.commands.executeCommand('aria.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Launch Python Bridge
            // Note: We need to pass a callback to update the UI with the stream URL
            const base64 = await CameraBridge.capture('native-python', (url) => {
                 if (AriaPanel.currentPanel) {
                     // We reuse the 'showStream' command because the Python server
                     // provides the exact same API (/stream, /trigger) as the Node.js bridge!
                     AriaPanel.currentPanel['_panel'].webview.postMessage({ command: 'showStream', url: url });
                 }
            });

            if (base64 && AriaPanel.currentPanel) {
                await AriaPanel.currentPanel.analyzeImage(base64);
            }
        } catch (e) {
            vscode.window.showErrorMessage("Python Bridge Failed: " + e);
        }
        return;
    }

    if (choice === 'Open Camera (Integrated - Simple Browser)') {
        const base64 = await CameraBridge.capture('embedded');
        if (base64) {
             if (!AriaPanel.currentPanel) {
                await vscode.commands.executeCommand('aria.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (AriaPanel.currentPanel) {
                await AriaPanel.currentPanel.analyzeImage(base64);
            }
        }
        return;
    }

    if (choice === 'Open Camera (External Browser)') {
        const base64 = await CameraBridge.capture('external');
        if (base64) {
             if (!AriaPanel.currentPanel) {
                await vscode.commands.executeCommand('aria.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (AriaPanel.currentPanel) {
                await AriaPanel.currentPanel.analyzeImage(base64);
            }
        }
        return;
    }

    if (choice === 'Open Camera (Built-in Webview)') {
        CameraPanel.createOrShow(vscode.extensions.getExtension('Ranch-Hand-Robotics.aria-vscode')!.extensionUri);
        return;
    }

    // Default: File Select
    // Ensure main panel is open for file analysis results
    if (!AriaPanel.currentPanel) {
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
            
            if (AriaPanel.currentPanel) {
                await AriaPanel.currentPanel.analyzeImage(base64);
            } else {
                vscode.window.showErrorMessage("A.R.I.A Panel failed to open.");
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to read image: ${e}`);
        }
    }
}
