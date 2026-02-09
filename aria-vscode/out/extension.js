"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const logger_1 = require("./utils/logger");
const patchedContentProvider_1 = require("./utils/patchedContentProvider");
const commands_1 = require("./commands");
const editorContext_1 = require("./utils/editorContext");
function activate(context) {
    // 1. Log activation
    logger_1.Logger.log("Extension activated");
    console.log('[A.R.I.A] Extension activated');
    // 2. Register Commands
    (0, commands_1.registerCommands)(context);
    // 3. Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "A.R.I.A ● Ready";
    statusBarItem.command = 'aria.openPanel';
    statusBarItem.tooltip = "Open A.R.I.A. Copilot";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // 4. Register Patched Content Provider for Diffs
    patchedContentProvider_1.PatchedContentProvider.register(context);
    // 4. File Awareness (Track Active Editor)
    (0, editorContext_1.activateEditorTracking)(context);
    if (vscode.window.activeTextEditor) {
        const fileName = vscode.window.activeTextEditor.document.fileName.split(/[\\/]/).pop();
        logger_1.Logger.log(`Active file: ${fileName}`);
    }
}
const cameraBridge_1 = require("./vision/cameraBridge");
function deactivate() {
    logger_1.Logger.log("Deactivating extension, cleaning up camera...");
    cameraBridge_1.CameraBridge.dispose();
}
//# sourceMappingURL=extension.js.map