import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { registerCommands } from './commands';
import { activateEditorTracking } from './utils/editorContext';

export function activate(context: vscode.ExtensionContext) {
    // 1. Log activation
    Logger.log("Extension activated");
    console.log('[A.R.I.A] Extension activated');

    // 2. Register Commands
    registerCommands(context);

    // 3. Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "A.R.I.A ● Ready";
    statusBarItem.command = 'aria.openPanel';
    statusBarItem.tooltip = "Open A.R.I.A. Copilot";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 4. File Awareness (Track Active Editor)
    activateEditorTracking(context);

    if (vscode.window.activeTextEditor) {
        const fileName = vscode.window.activeTextEditor.document.fileName.split(/[\\/]/).pop();
        Logger.log(`Active file: ${fileName}`);
    }
}

export function deactivate() {}
