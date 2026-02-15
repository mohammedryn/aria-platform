
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { HardwareContext } from '../context/hardwareContext';
import { HardwareValidator } from '../hardware/validator';
import { AriaPanel } from '../panels/ariaPanel';
import { getLastActiveEditor } from '../utils/editorContext';

export async function validateHardware() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('A.R.I.A: No workspace open.');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 1. Get Hardware Context
    vscode.window.setStatusBarMessage(`A.R.I.A: Validating Hardware...`);
    const hwInfo = await HardwareContext.scan();

    if (hwInfo.projects.length === 0) {
        vscode.window.showWarningMessage("A.R.I.A: No supported hardware configuration detected (missing platformio.ini?).");
        return;
    }

    const board = hwInfo.projects[0].board;

    // 2. Read SOURCE CODE from src/ folder (not the active editor!)
    // This ensures we analyze actual code, not platformio.ini or other files
    let code = "";
    const srcDir = path.join(workspaceRoot, 'src');

    if (fs.existsSync(srcDir)) {
        // Read all .cpp, .c, .h, .ino files in src/
        const srcFiles = fs.readdirSync(srcDir).filter(f =>
            /\.(cpp|c|h|hpp|ino)$/i.test(f)
        );

        for (const file of srcFiles) {
            const filePath = path.join(srcDir, file);
            try {
                code += fs.readFileSync(filePath, 'utf8') + "\n";
            } catch (e) {
                Logger.log(`[Validator] Failed to read ${file}: ${e}`);
            }
        }
    }

    // Fallback: If no src/ files, try active editor
    if (!code.trim()) {
        const editor = getLastActiveEditor();
        if (editor && /\.(cpp|c|h|hpp|ino)$/i.test(editor.document.fileName)) {
            code = editor.document.getText();
        }
    }

    if (!code.trim()) {
        vscode.window.showWarningMessage("A.R.I.A: No source files found in src/ folder.");
        return;
    }

    // 3. Run Validator
    const visionContext = AriaPanel.currentPanel?.visionResult;
    const result = HardwareValidator.validate(code, board, visionContext);

    Logger.logStructured('Hardware Validation', {
        Board: board,
        Vision: visionContext ? "Active" : "None",
        Status: result.status,
        Issues: result.issues.length,
        Peripherals: result.peripherals.join(', ')
    });

    // 4. Send Results to Panel
    AriaPanel.postMessage({
        type: 'showHardwareValidation',
        data: result,
        metadata: {
            board: board,
            workspaceRoot: workspaceRoot
        }
    });

    vscode.window.setStatusBarMessage(`A.R.I.A: Hardware Validation: ${result.status.toUpperCase()}`, 4000);
}
