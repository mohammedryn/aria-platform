"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHardware = validateHardware;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const logger_1 = require("../utils/logger");
const hardwareContext_1 = require("../context/hardwareContext");
const validator_1 = require("../hardware/validator");
const ariaPanel_1 = require("../panels/ariaPanel");
const editorContext_1 = require("../utils/editorContext");
async function validateHardware() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('A.R.I.A: No workspace open.');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    // 1. Get Hardware Context
    vscode.window.setStatusBarMessage(`A.R.I.A: Validating Hardware...`);
    const hwInfo = await hardwareContext_1.HardwareContext.scan();
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
        const srcFiles = fs.readdirSync(srcDir).filter(f => /\.(cpp|c|h|hpp|ino)$/i.test(f));
        for (const file of srcFiles) {
            const filePath = path.join(srcDir, file);
            try {
                code += fs.readFileSync(filePath, 'utf8') + "\n";
            }
            catch (e) {
                logger_1.Logger.log(`[Validator] Failed to read ${file}: ${e}`);
            }
        }
    }
    // Fallback: If no src/ files, try active editor
    if (!code.trim()) {
        const editor = (0, editorContext_1.getLastActiveEditor)();
        if (editor && /\.(cpp|c|h|hpp|ino)$/i.test(editor.document.fileName)) {
            code = editor.document.getText();
        }
    }
    if (!code.trim()) {
        vscode.window.showWarningMessage("A.R.I.A: No source files found in src/ folder.");
        return;
    }
    // 3. Run Validator
    const visionContext = ariaPanel_1.AriaPanel.currentPanel?.visionResult;
    const result = validator_1.HardwareValidator.validate(code, board, visionContext);
    logger_1.Logger.logStructured('Hardware Validation', {
        Board: board,
        Vision: visionContext ? "Active" : "None",
        Status: result.status,
        Issues: result.issues.length,
        Peripherals: result.peripherals.join(', ')
    });
    // 4. Send Results to Panel
    ariaPanel_1.AriaPanel.postMessage({
        type: 'showHardwareValidation',
        data: result,
        metadata: {
            board: board,
            workspaceRoot: workspaceRoot
        }
    });
    vscode.window.setStatusBarMessage(`A.R.I.A: Hardware Validation: ${result.status.toUpperCase()}`, 4000);
}
//# sourceMappingURL=validateHardware.js.map