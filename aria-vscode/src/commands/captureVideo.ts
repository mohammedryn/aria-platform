import * as vscode from 'vscode';
import * as path from 'path';
import { AriaPanel } from '../panels/ariaPanel';
import { CameraBridge } from '../vision/cameraBridge';

export async function captureVideo() {
    const choice = await vscode.window.showQuickPick(
        ['Record Video (Native Camera)', 'Select Video File...'],
        { placeHolder: 'How do you want to capture hardware video?' }
    );

    if (!choice) return;

    // Ensure main panel is open
    if (!AriaPanel.currentPanel) {
        await vscode.commands.executeCommand('aria.openPanel');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (choice === 'Record Video (Native Camera)') {
        try {
            if (AriaPanel.currentPanel) {
                await AriaPanel.currentPanel.startVideoCapture();
            }
        } catch (e) {
            vscode.window.showErrorMessage("Video Capture Failed: " + e);
        }
        return;
    }

    if (choice === 'Select Video File...') {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Videos': ['mp4', 'mov', 'avi', 'webm']
            },
            openLabel: 'Analyze Video'
        });

        if (uris && uris.length > 0) {
            const filePath = uris[0].fsPath;
            if (AriaPanel.currentPanel) {
                await AriaPanel.currentPanel.processVideo(filePath);
            }
        }
    }
}
