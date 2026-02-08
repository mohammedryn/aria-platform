import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { PlatformIOManager } from '../firmware/platformioManager';
import { HardwareContext } from '../context/hardwareContext';
import { HardwareValidator } from '../hardware/validator';
import { AriaPanel } from '../panels/ariaPanel';
import { getLastActiveEditor } from '../utils/editorContext';

export async function buildAndFlash() {
    const options = ['Build Firmware', 'Flash Firmware'];
    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select Firmware Action'
    });

    if (selection === 'Build Firmware') {
        await runBuild();
    } else if (selection === 'Flash Firmware') {
        await runFlash();
    }
}

import { GeminiClient } from '../ai/geminiClient';

export async function runBuild() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage("A.R.I.A: No workspace open.");
        return;
    }

    if (!await PlatformIOManager.isProjectDetected()) {
        const init = await vscode.window.showWarningMessage(
            "PlatformIO project not found. Initialize?",
            "Yes", "No"
        );
        if (init === "Yes") {
            const board = await vscode.window.showInputBox({ prompt: "Enter Board ID (e.g. uno, teensy41)" });
            if (board) {
                await PlatformIOManager.initProject(board, workspaceRoot);
            } else {
                return;
            }
        } else {
            return;
        }
    }

    // Run Build
    const result = await PlatformIOManager.buildFirmware(workspaceRoot);
    if (result.success) {
        vscode.window.showInformationMessage("A.R.I.A: Firmware Build Success");
    } else {
        vscode.window.showErrorMessage("A.R.I.A: Firmware Build Failed. Analyzing Error...");
        
        // Auto-Analyze Terminal Error
        AriaPanel.postMessage({ type: 'analysisLoading' });
        
        // Scan for context
        const hwInfo = await HardwareContext.scan();
        const hardwareContext = hwInfo.projects.map(p => 
            `Board: ${p.board}, Framework: ${p.framework}, Libs: ${p.libraries.join(', ')}`
        ).join('; ');

        // Call AI
        try {
            const analysis = await GeminiClient.analyzeCode({
                code: result.output,
                filePath: "terminal_output.log",
                language: "plaintext",
                hardwareContext: hardwareContext,
                source: 'terminal'
            });
            AriaPanel.currentPanel?.showAnalysisResult(analysis, {
                filePath: "terminal_output.log",
                source: 'terminal',
                hardware: hardwareContext
            });
        } catch (e) {
            Logger.log(`[A.R.I.A] Auto-analysis failed: ${e}`);
            AriaPanel.postMessage({ type: 'analysisError', error: String(e) });
        }
    }
    
    // Update Panel UI
    AriaPanel.postMessage({ type: 'buildStatus', status: result.success ? 'success' : 'fail' });
}

export async function runFlash() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage("A.R.I.A: No workspace open.");
        return;
    }

    // 1. Safety Interlocks
    // A. Validation Status
    const editor = getLastActiveEditor();
    if (editor) {
        const code = editor.document.getText();
        const hwInfo = await HardwareContext.scan();
        const board = hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "unknown";
        const visionContext = AriaPanel.currentPanel?.visionResult;
        
        const valResult = HardwareValidator.validate(code, board, visionContext);
        
        if (valResult.status === 'fail') {
            vscode.window.showErrorMessage("A.R.I.A: Safety Lock: Flash blocked due to Hardware Validation FAIL.");
            Logger.log("[A.R.I.A] Flash aborted: Hardware Validation FAIL");
            return;
        }

        // B. Board Mismatch (Vision)
        if (visionContext && visionContext.detectedBoards.length > 0) {
             const visionBoard = visionContext.detectedBoards[0].toLowerCase();
             const configBoard = board.toLowerCase();
             if (!configBoard.includes(visionBoard) && !visionBoard.includes(configBoard)) {
                 const proceed = await vscode.window.showWarningMessage(
                     `Board Mismatch: Configured '${board}' but Vision sees '${visionBoard}'. Proceed?`,
                     "Abort", "Proceed Riskily"
                 );
                 if (proceed !== "Proceed Riskily") {
                     Logger.log("[A.R.I.A] Flash aborted: Board Mismatch");
                     return;
                 }
             }
        }
    }

    // 2. Port Handling
    const ports = await PlatformIOManager.listPorts();
    let selectedPort: string | undefined;

    if (ports.length === 0) {
        vscode.window.showErrorMessage("A.R.I.A: No compatible device detected.");
        Logger.log("[A.R.I.A] Flash aborted: No device detected");
        return;
    } else if (ports.length === 1) {
        selectedPort = ports[0];
    } else {
        selectedPort = await vscode.window.showQuickPick(ports, { placeHolder: "Select Upload Port" });
        if (!selectedPort) return;
    }

    // 3. Explicit Confirmation
    const confirm = await vscode.window.showWarningMessage(
        `This will flash firmware to device at ${selectedPort}. Continue?`,
        { modal: true },
        "Yes, Flash Firmware"
    );

    if (confirm !== "Yes, Flash Firmware") {
        Logger.log("[A.R.I.A] Flash aborted: User cancelled");
        return;
    }

    Logger.log("[A.R.I.A] Flash confirmed by user");

    // 4. Flash
    const success = await PlatformIOManager.flashFirmware(workspaceRoot, selectedPort);
    
    if (success) {
        vscode.window.showInformationMessage("A.R.I.A: Upload Complete");
    } else {
        vscode.window.showErrorMessage("A.R.I.A: Flash Failed. Check logs.");
    }

    // Update Panel UI
    AriaPanel.postMessage({ type: 'flashStatus', status: success ? 'success' : 'fail' });
}
