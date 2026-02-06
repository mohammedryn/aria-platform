import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisResult } from '../types';
import { GeminiClient } from '../ai/geminiClient';
import { AnalysisInput } from '../ai/types';
import { HardwareContext } from '../context/hardwareContext';
import { AriaPanel } from '../panels/ariaPanel';
import { getLastActiveEditor } from '../utils/editorContext';

export async function analyzeSelection() {
    const editor = getLastActiveEditor();
    if (!editor) {
        vscode.window.showWarningMessage('A.R.I.A: No active editor found.');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('A.R.I.A: Select code to analyze.');
        return;
    }

    const text = editor.document.getText(selection);
    const lines = text.split('\n').length;

    // 1. Basic Metadata Analysis
    const result: AnalysisResult = {
        source: 'selection',
        filePath: vscode.workspace.asRelativePath(editor.document.uri),
        language: editor.document.languageId,
        lines: lines,
        size: text.length,
        timestamp: Date.now()
    };

    vscode.window.setStatusBarMessage(`A.R.I.A: Scanning Hardware Context...`);
    const hwInfo = await HardwareContext.scan();

    // 2. Prepare AI Input
    const aiInput: AnalysisInput = {
        source: 'selection',
        code: text,
        language: result.language || 'text',
        filePath: result.filePath || 'unknown',
        hardwareContext: hwInfo.summary
    };

    // Inject Vision Context if available
    if (AriaPanel.currentPanel && AriaPanel.currentPanel.visionResult) {
        const v = AriaPanel.currentPanel.visionResult;
        aiInput.visionContext = {
            boards: v.detectedBoards,
            components: v.detectedComponents,
            confidence: v.confidence
        };
        Logger.log(`[A.R.I.A] Injected Vision Context: ${v.detectedBoards.join(', ')}`);
    }

    vscode.window.setStatusBarMessage(`A.R.I.A: Analyzing with AI...`);

    // 3. Call AI (Silent)
    const aiResult = await GeminiClient.analyzeCode(aiInput);

    // 4. Log Structured Output
    Logger.logStructured('AI Analysis Complete', {
        File: result.filePath,
        Lines: result.lines,
        Hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None",
        Issues: aiResult.detectedIssues.length,
        Recommendations: aiResult.recommendations.length,
        Confidence: aiResult.confidence,
        Summary: aiResult.summary
    });

    Logger.show();
    vscode.window.showInformationMessage(`A.R.I.A: Analysis Complete (${aiResult.detectedIssues.length} issues found)`);
    vscode.window.setStatusBarMessage(`A.R.I.A: Analysis Complete`, 3000);

    // Send to Webview Panel
    AriaPanel.postMessage({ 
        type: 'showAnalysis', 
        data: aiResult,
        metadata: {
            source: 'selection',
            filePath: result.filePath,
            hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None"
        }
    });
}
