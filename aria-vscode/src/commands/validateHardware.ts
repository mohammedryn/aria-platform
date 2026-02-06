
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { HardwareContext } from '../context/hardwareContext';
import { HardwareValidator } from '../hardware/validator';
import { AriaPanel } from '../panels/ariaPanel';
import { getLastActiveEditor } from '../utils/editorContext';

export async function validateHardware() {
    const editor = getLastActiveEditor();
    if (!editor) {
        vscode.window.showWarningMessage('A.R.I.A: No active file to validate.');
        return;
    }

    const document = editor.document;
    const code = document.getText();

    // 1. Get Hardware Context
    vscode.window.setStatusBarMessage(`A.R.I.A: Validating Hardware...`);
    const hwInfo = await HardwareContext.scan();
    
    if (hwInfo.projects.length === 0) {
        vscode.window.showWarningMessage("A.R.I.A: No supported hardware configuration detected (missing platformio.ini?).");
        return;
    }

    const board = hwInfo.projects[0].board;

    // 2. Run Validator
    const visionContext = AriaPanel.currentPanel?.visionResult;
    const result = HardwareValidator.validate(code, board, visionContext);

    Logger.logStructured('Hardware Validation', {
        Board: board,
        Vision: visionContext ? "Active" : "None",
        Status: result.status,
        Issues: result.issues.length,
        Peripherals: result.peripherals.join(', ')
    });

    // 3. Send Results to Panel
    AriaPanel.postMessage({
        type: 'showHardwareValidation',
        data: result,
        metadata: {
            board: board,
            workspaceRoot: vscode.workspace.workspaceFolders?.[0].uri.fsPath
        }
    });

    vscode.window.setStatusBarMessage(`A.R.I.A: Hardware Validation: ${result.status.toUpperCase()}`, 4000);
}
