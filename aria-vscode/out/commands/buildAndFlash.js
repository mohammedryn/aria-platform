"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAndFlash = buildAndFlash;
exports.runBuild = runBuild;
exports.runFlash = runFlash;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
const platformioManager_1 = require("../firmware/platformioManager");
const hardwareContext_1 = require("../context/hardwareContext");
const validator_1 = require("../hardware/validator");
const ariaPanel_1 = require("../panels/ariaPanel");
const editorContext_1 = require("../utils/editorContext");
async function buildAndFlash() {
    const options = ['Build Firmware', 'Flash Firmware'];
    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select Firmware Action'
    });
    if (selection === 'Build Firmware') {
        await runBuild();
    }
    else if (selection === 'Flash Firmware') {
        await runFlash();
    }
}
const geminiClient_1 = require("../ai/geminiClient");
async function runBuild() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage("A.R.I.A: No workspace open.");
        return;
    }
    if (!await platformioManager_1.PlatformIOManager.isProjectDetected()) {
        const init = await vscode.window.showWarningMessage("PlatformIO project not found. Initialize?", "Yes", "No");
        if (init === "Yes") {
            const board = await vscode.window.showInputBox({ prompt: "Enter Board ID (e.g. uno, teensy41)" });
            if (board) {
                await platformioManager_1.PlatformIOManager.initProject(board, workspaceRoot);
            }
            else {
                return;
            }
        }
        else {
            return;
        }
    }
    // Run Build
    const result = await platformioManager_1.PlatformIOManager.buildFirmware(workspaceRoot);
    if (result.success) {
        vscode.window.showInformationMessage("A.R.I.A: Firmware Build Success");
    }
    else {
        vscode.window.showErrorMessage("A.R.I.A: Firmware Build Failed. Analyzing Error...");
        // Auto-Analyze Terminal Error
        ariaPanel_1.AriaPanel.postMessage({ type: 'analysisLoading', message: 'Analyzing Build Error (Smart Repair)...' });
        // Scan for context
        const hwInfo = await hardwareContext_1.HardwareContext.scan();
        const hardwareContext = hwInfo.projects.map(p => `Board: ${p.board}, Framework: ${p.framework}, Libs: ${p.libraries.join(', ')}`).join('; ');
        // Try to identify the failing file from the log
        const errorLog = result.output;
        let failingFileContent = "";
        let failingFilePath = "terminal_output.log";
        // Regex to find "src/main.cpp:10:5: error:" or similar
        const fileMatch = errorLog.match(/src[\/\\][a-zA-Z0-9_\-]+\.(cpp|c|h|hpp|ino)/i);
        if (fileMatch) {
            const relPath = fileMatch[0];
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (workspaceRoot) {
                const absPath = require('path').join(workspaceRoot, relPath);
                try {
                    const doc = await vscode.workspace.openTextDocument(absPath);
                    failingFileContent = doc.getText();
                    failingFilePath = relPath;
                    logger_1.Logger.log(`[A.R.I.A] Identified failing file: ${absPath}`);
                }
                catch (e) {
                    logger_1.Logger.log(`[A.R.I.A] Could not read failing file: ${e}`);
                }
            }
        }
        // Fallback to active editor if no file found in log, but user is likely looking at the code
        if (!failingFileContent) {
            const editor = (0, editorContext_1.getLastActiveEditor)();
            if (editor) {
                failingFileContent = editor.document.getText();
                failingFilePath = vscode.workspace.asRelativePath(editor.document.uri);
            }
        }
        // Call AI with Specialized Fix Method
        try {
            let analysis;
            if (failingFileContent) {
                analysis = await geminiClient_1.GeminiClient.fixBuildError(errorLog, failingFileContent, failingFilePath);
            }
            else {
                // Fallback to generic analysis if no code context
                analysis = await geminiClient_1.GeminiClient.analyzeCode({
                    code: result.output,
                    filePath: "terminal_output.log",
                    language: "plaintext",
                    hardwareContext: hardwareContext,
                    source: 'terminal'
                });
            }
            ariaPanel_1.AriaPanel.currentPanel?.showAnalysisResult(analysis, {
                filePath: failingFilePath,
                source: 'build-error',
                hardware: hardwareContext
            });
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Auto-analysis failed: ${e}`);
            ariaPanel_1.AriaPanel.postMessage({ type: 'analysisError', error: String(e) });
        }
    }
    // Update Panel UI
    ariaPanel_1.AriaPanel.postMessage({ type: 'buildStatus', status: result.success ? 'success' : 'fail' });
}
async function runFlash() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage("A.R.I.A: No workspace open.");
        return;
    }
    // 1. Safety Interlocks
    // A. Validation Status
    const editor = (0, editorContext_1.getLastActiveEditor)();
    if (editor) {
        const code = editor.document.getText();
        const hwInfo = await hardwareContext_1.HardwareContext.scan();
        const board = hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "unknown";
        const visionContext = ariaPanel_1.AriaPanel.currentPanel?.visionResult;
        const valResult = validator_1.HardwareValidator.validate(code, board, visionContext);
        if (valResult.status === 'fail') {
            vscode.window.showErrorMessage("A.R.I.A: Safety Lock: Flash blocked due to Hardware Validation FAIL.");
            logger_1.Logger.log("[A.R.I.A] Flash aborted: Hardware Validation FAIL");
            return;
        }
        // B. Board Mismatch (Vision)
        if (visionContext && visionContext.detectedBoards.length > 0) {
            const visionBoard = visionContext.detectedBoards[0].toLowerCase();
            const configBoard = board.toLowerCase();
            if (!configBoard.includes(visionBoard) && !visionBoard.includes(configBoard)) {
                const proceed = await vscode.window.showWarningMessage(`Board Mismatch: Configured '${board}' but Vision sees '${visionBoard}'. Proceed?`, "Abort", "Proceed Riskily");
                if (proceed !== "Proceed Riskily") {
                    logger_1.Logger.log("[A.R.I.A] Flash aborted: Board Mismatch");
                    return;
                }
            }
        }
    }
    // 2. Port Handling
    const ports = await platformioManager_1.PlatformIOManager.listPorts();
    let selectedPort;
    if (ports.length === 0) {
        vscode.window.showErrorMessage("A.R.I.A: No compatible device detected.");
        logger_1.Logger.log("[A.R.I.A] Flash aborted: No device detected");
        return;
    }
    else if (ports.length === 1) {
        selectedPort = ports[0];
    }
    else {
        selectedPort = await vscode.window.showQuickPick(ports, { placeHolder: "Select Upload Port" });
        if (!selectedPort)
            return;
    }
    // 3. Explicit Confirmation
    const confirm = await vscode.window.showWarningMessage(`This will flash firmware to device at ${selectedPort}. Continue?`, { modal: true }, "Yes, Flash Firmware");
    if (confirm !== "Yes, Flash Firmware") {
        logger_1.Logger.log("[A.R.I.A] Flash aborted: User cancelled");
        return;
    }
    logger_1.Logger.log("[A.R.I.A] Flash confirmed by user");
    // 4. Flash
    const success = await platformioManager_1.PlatformIOManager.flashFirmware(workspaceRoot, selectedPort);
    if (success) {
        vscode.window.showInformationMessage("A.R.I.A: Upload Complete");
    }
    else {
        vscode.window.showErrorMessage("A.R.I.A: Flash Failed. Check logs.");
    }
    // Update Panel UI
    ariaPanel_1.AriaPanel.postMessage({ type: 'flashStatus', status: success ? 'success' : 'fail' });
}
//# sourceMappingURL=buildAndFlash.js.map