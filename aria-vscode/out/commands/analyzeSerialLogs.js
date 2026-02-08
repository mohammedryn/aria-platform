"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSerialLogsCommand = analyzeSerialLogsCommand;
const vscode = require("vscode");
const serialManager_1 = require("../serial/serialManager");
const geminiClient_1 = require("../ai/geminiClient");
const hardwareContext_1 = require("../context/hardwareContext");
const logger_1 = require("../utils/logger");
const ariaPanel_1 = require("../panels/ariaPanel");
const platformioManager_1 = require("../firmware/platformioManager");
const validator_1 = require("../hardware/validator");
const editorContext_1 = require("../utils/editorContext");
async function analyzeSerialLogsCommand() {
    if (!serialManager_1.SerialManager.isActive()) {
        vscode.window.showWarningMessage("No active serial session. Please start Serial Monitor first.");
        return;
    }
    if (platformioManager_1.PlatformIOManager.isBusy) {
        vscode.window.showWarningMessage("Safety Interlock: Cannot analyze logs while firmware is building/flashing.");
        return;
    }
    // Safety Interlock: Check Hardware Validation
    const editor = (0, editorContext_1.getLastActiveEditor)();
    if (editor) {
        // We can only validate if we have code context. 
        // If the user is debugging a file, we want to ensure THAT file is valid before advising.
        const code = editor.document.getText();
        const hwInfo = await hardwareContext_1.HardwareContext.scan();
        if (hwInfo.projects.length > 0) {
            const board = hwInfo.projects[0].board;
            const visionContext = ariaPanel_1.AriaPanel.currentPanel?.visionResult;
            const validationResult = validator_1.HardwareValidator.validate(code, board, visionContext);
            if (validationResult.status === 'fail') {
                const reasons = validationResult.issues.join('; ');
                vscode.window.showErrorMessage(`Safety Interlock: Hardware Validation FAILED. Analysis blocked. Reasons: ${reasons}`);
                logger_1.Logger.log(`[A.R.I.A] Analysis blocked due to hardware validation failure: ${reasons}`);
                return;
            }
        }
    }
    const logs = serialManager_1.SerialManager.getLogs();
    if (logs.length === 0) {
        vscode.window.showWarningMessage("No serial data available to analyze.");
        return;
    }
    logger_1.Logger.log("[A.R.I.A] Serial analysis requested by user");
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "A.R.I.A: Analyzing Serial Logs...",
        cancellable: false
    }, async () => {
        try {
            const context = await hardwareContext_1.HardwareContext.scan();
            const result = await geminiClient_1.GeminiClient.analyzeSerialLogs(logs, JSON.stringify(context));
            logger_1.Logger.log(`[A.R.I.A] Serial analysis complete (confidence: ${result.confidence})`);
            if (ariaPanel_1.AriaPanel.currentPanel) {
                ariaPanel_1.AriaPanel.currentPanel.showSerialAnalysis(result);
            }
            else {
                vscode.window.showInformationMessage("Analysis complete. Open A.R.I.A Panel to view results.");
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Analysis failed: ${e}`);
            logger_1.Logger.log(`[A.R.I.A] Analysis Error: ${e}`);
        }
    });
}
//# sourceMappingURL=analyzeSerialLogs.js.map