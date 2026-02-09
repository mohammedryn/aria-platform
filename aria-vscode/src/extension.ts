import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { PatchedContentProvider } from './utils/patchedContentProvider';
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

    // 4. Register Patched Content Provider for Diffs
    PatchedContentProvider.register(context);

    // 4. File Awareness (Track Active Editor)
    activateEditorTracking(context);

    if (vscode.window.activeTextEditor) {
        const fileName = vscode.window.activeTextEditor.document.fileName.split(/[\\/]/).pop();
        Logger.log(`Active file: ${fileName}`);
    }
}

import { CameraBridge } from './vision/cameraBridge';

export function deactivate() {
    Logger.log("Deactivating extension, cleaning up camera...");
    CameraBridge.dispose();
}
