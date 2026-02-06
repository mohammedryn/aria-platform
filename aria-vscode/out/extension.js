"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const logger_1 = require("./utils/logger");
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
    // 4. File Awareness (Track Active Editor)
    (0, editorContext_1.activateEditorTracking)(context);
    if (vscode.window.activeTextEditor) {
        const fileName = vscode.window.activeTextEditor.document.fileName.split(/[\\/]/).pop();
        logger_1.Logger.log(`Active file: ${fileName}`);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map