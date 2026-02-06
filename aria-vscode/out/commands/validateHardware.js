"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHardware = validateHardware;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
const hardwareContext_1 = require("../context/hardwareContext");
const validator_1 = require("../hardware/validator");
const ariaPanel_1 = require("../panels/ariaPanel");
const editorContext_1 = require("../utils/editorContext");
async function validateHardware() {
    const editor = (0, editorContext_1.getLastActiveEditor)();
    if (!editor) {
        vscode.window.showWarningMessage('A.R.I.A: No active file to validate.');
        return;
    }
    const document = editor.document;
    const code = document.getText();
    // 1. Get Hardware Context
    vscode.window.setStatusBarMessage(`A.R.I.A: Validating Hardware...`);
    const hwInfo = await hardwareContext_1.HardwareContext.scan();
    if (hwInfo.projects.length === 0) {
        vscode.window.showWarningMessage("A.R.I.A: No supported hardware configuration detected (missing platformio.ini?).");
        return;
    }
    const board = hwInfo.projects[0].board;
    // 2. Run Validator
    const visionContext = ariaPanel_1.AriaPanel.currentPanel?.visionResult;
    const result = validator_1.HardwareValidator.validate(code, board, visionContext);
    logger_1.Logger.logStructured('Hardware Validation', {
        Board: board,
        Vision: visionContext ? "Active" : "None",
        Status: result.status,
        Issues: result.issues.length,
        Peripherals: result.peripherals.join(', ')
    });
    // 3. Send Results to Panel
    ariaPanel_1.AriaPanel.postMessage({
        type: 'showHardwareValidation',
        data: result,
        metadata: {
            board: board,
            workspaceRoot: vscode.workspace.workspaceFolders?.[0].uri.fsPath
        }
    });
    vscode.window.setStatusBarMessage(`A.R.I.A: Hardware Validation: ${result.status.toUpperCase()}`, 4000);
}
//# sourceMappingURL=validateHardware.js.map