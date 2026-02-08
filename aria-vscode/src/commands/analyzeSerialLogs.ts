import * as vscode from 'vscode';
import { SerialManager } from '../serial/serialManager';
import { GeminiClient } from '../ai/geminiClient';
import { HardwareContext } from '../context/hardwareContext';
import { Logger } from '../utils/logger';
import { AriaPanel } from '../panels/ariaPanel';
import { PlatformIOManager } from '../firmware/platformioManager';
import { HardwareValidator } from '../hardware/validator';
import { getLastActiveEditor } from '../utils/editorContext';

export async function analyzeSerialLogsCommand() {
    if (!SerialManager.isActive()) {
        vscode.window.showWarningMessage("No active serial session. Please start Serial Monitor first.");
        return;
    }

    if (PlatformIOManager.isBusy) {
        vscode.window.showWarningMessage("Safety Interlock: Cannot analyze logs while firmware is building/flashing.");
        return;
    }

    // Safety Interlock: Check Hardware Validation
    const editor = getLastActiveEditor();
    if (editor) {
        // We can only validate if we have code context. 
        // If the user is debugging a file, we want to ensure THAT file is valid before advising.
        const code = editor.document.getText();
        const hwInfo = await HardwareContext.scan();
        
        if (hwInfo.projects.length > 0) {
            const board = hwInfo.projects[0].board;
            const visionContext = AriaPanel.currentPanel?.visionResult;
            const validationResult = HardwareValidator.validate(code, board, visionContext);
            
            if (validationResult.status === 'fail') {
                const reasons = validationResult.issues.join('; ');
                vscode.window.showErrorMessage(`Safety Interlock: Hardware Validation FAILED. Analysis blocked. Reasons: ${reasons}`);
                Logger.log(`[A.R.I.A] Analysis blocked due to hardware validation failure: ${reasons}`);
                return;
            }
        }
    }

    const logs = SerialManager.getLogs();
    if (logs.length === 0) {
        vscode.window.showWarningMessage("No serial data available to analyze.");
        return;
    }

    Logger.log("[A.R.I.A] Serial analysis requested by user");
    
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "A.R.I.A: Analyzing Serial Logs...",
        cancellable: false
    }, async () => {
        try {
            const context = await HardwareContext.scan();
            const result = await GeminiClient.analyzeSerialLogs(logs, JSON.stringify(context));
            
            Logger.log(`[A.R.I.A] Serial analysis complete (confidence: ${result.confidence})`);
            
            if (AriaPanel.currentPanel) {
                AriaPanel.currentPanel.showSerialAnalysis(result);
            } else {
                vscode.window.showInformationMessage("Analysis complete. Open A.R.I.A Panel to view results.");
            }

        } catch (e) {
            vscode.window.showErrorMessage(`Analysis failed: ${e}`);
            Logger.log(`[A.R.I.A] Analysis Error: ${e}`);
        }
    });
}
