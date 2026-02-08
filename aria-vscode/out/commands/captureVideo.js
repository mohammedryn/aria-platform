"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureVideo = captureVideo;
const vscode = require("vscode");
const ariaPanel_1 = require("../panels/ariaPanel");
async function captureVideo() {
    const choice = await vscode.window.showQuickPick(['Record Video (Native Camera)', 'Select Video File...'], { placeHolder: 'How do you want to capture hardware video?' });
    if (!choice)
        return;
    // Ensure main panel is open
    if (!ariaPanel_1.AriaPanel.currentPanel) {
        await vscode.commands.executeCommand('aria.openPanel');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (choice === 'Record Video (Native Camera)') {
        try {
            if (ariaPanel_1.AriaPanel.currentPanel) {
                await ariaPanel_1.AriaPanel.currentPanel.startVideoCapture();
            }
        }
        catch (e) {
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
            if (ariaPanel_1.AriaPanel.currentPanel) {
                await ariaPanel_1.AriaPanel.currentPanel.processVideo(filePath);
            }
        }
    }
}
//# sourceMappingURL=captureVideo.js.map