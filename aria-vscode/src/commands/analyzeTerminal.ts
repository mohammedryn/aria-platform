import * as vscode from 'vscode';
import { GeminiClient } from '../ai/geminiClient';
import { Logger } from '../utils/logger';
import { AriaPanel } from '../panels/ariaPanel';
import { HardwareContext } from '../context/hardwareContext';

export async function analyzeTerminalCommand() {
    // 1. Get text from Clipboard (since we can't read terminal directly)
    // We assume the user has just selected text and hit copy, or we can try to trigger copy
    
    // Attempt to copy selection from terminal first
    await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
    
    // Wait a brief moment for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const terminalText = await vscode.env.clipboard.readText();

    if (!terminalText || terminalText.trim().length === 0) {
        vscode.window.showWarningMessage("A.R.I.A: No text selected in terminal. Please select the error text and try again.");
        return;
    }

    // 2. Prepare analysis
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "A.R.I.A: Analyzing Terminal Output...",
        cancellable: false
    }, async () => {
        try {
            const hwInfo = await HardwareContext.scan();
            const hardwareContext = hwInfo.summary;

            // 3. Send to Gemini
            const result = await GeminiClient.analyzeCode({
                source: 'terminal',
                code: terminalText,
                language: 'text', // Terminal output is text/logs
                filePath: 'terminal-output', // Virtual path
                hardwareContext: hardwareContext
            });

            // 4. Show Results
            Logger.logStructured('Terminal Analysis', {
                confidence: result.confidence,
                issues: result.detectedIssues.length,
                suggestions: result.suggestions?.length || 0
            });

            if (AriaPanel.currentPanel) {
                AriaPanel.currentPanel.showAnalysisResult(result, {
                    source: 'selection',
                    filePath: 'terminal-output',
                    hardware: hardwareContext
                });
            } else {
                // If panel is closed, open it then show
                vscode.commands.executeCommand('aria.openPanel');
                // Wait for panel to open? The panel might need a moment to be ready to receive messages
                // But for now, let's just show a notification if panel wasn't open
                vscode.window.showInformationMessage(`Analysis Complete: ${result.summary}`);
            }

        } catch (e) {
            vscode.window.showErrorMessage(`Analysis failed: ${e}`);
            Logger.log(`[A.R.I.A] Terminal Analysis Error: ${e}`);
        }
    });
}
