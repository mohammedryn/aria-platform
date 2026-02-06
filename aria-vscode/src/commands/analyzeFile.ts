import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisResult } from '../types';
import { GeminiClient } from '../ai/geminiClient';
import { AnalysisInput } from '../ai/types';
import { HardwareContext } from '../context/hardwareContext';
import { AriaPanel } from '../panels/ariaPanel';
import { getLastActiveEditor } from '../utils/editorContext';

export async function analyzeFile() {
    const editor = getLastActiveEditor();
    if (!editor) {
        vscode.window.showWarningMessage('A.R.I.A: No active file to analyze.');
        return;
    }

    const document = editor.document;
    const text = document.getText();
    const lines = document.lineCount;

    const result: AnalysisResult = {
        source: 'file',
        filePath: vscode.workspace.asRelativePath(document.uri),
        language: document.languageId,
        lines: lines,
        size: text.length,
        timestamp: Date.now()
    };

    vscode.window.setStatusBarMessage(`A.R.I.A: Scanning Hardware Context...`);
    const hwInfo = await HardwareContext.scan();

    vscode.window.setStatusBarMessage(`A.R.I.A: Analyzing File with AI...`);

    // Prepare AI Input
    const aiInput: AnalysisInput = {
        source: 'file',
        code: text,
        language: result.language || 'text',
        filePath: result.filePath || 'unknown',
        hardwareContext: hwInfo.summary
    };

    // Call AI
    const aiResult = await GeminiClient.analyzeCode(aiInput);

    Logger.logStructured('File Analysis Complete', {
        File: result.filePath,
        Lines: result.lines,
        Hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None",
        Issues: aiResult.detectedIssues.length,
        Recommendations: aiResult.recommendations.length,
        Confidence: aiResult.confidence,
        Summary: aiResult.summary
    });

    Logger.show();
    vscode.window.showInformationMessage(`A.R.I.A: File Analysis Complete (${aiResult.detectedIssues.length} issues)`);
    vscode.window.setStatusBarMessage(`A.R.I.A: File Analysis Complete`, 3000);

    // Send to Webview Panel
    AriaPanel.postMessage({ 
        type: 'showAnalysis', 
        data: aiResult,
        metadata: {
            source: 'file',
            filePath: result.filePath,
            hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None"
        }
    });
}
