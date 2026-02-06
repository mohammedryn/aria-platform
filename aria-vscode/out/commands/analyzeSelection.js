"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSelection = analyzeSelection;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
const geminiClient_1 = require("../ai/geminiClient");
const hardwareContext_1 = require("../context/hardwareContext");
const ariaPanel_1 = require("../panels/ariaPanel");
const editorContext_1 = require("../utils/editorContext");
async function analyzeSelection() {
    const editor = (0, editorContext_1.getLastActiveEditor)();
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
    const result = {
        source: 'selection',
        filePath: vscode.workspace.asRelativePath(editor.document.uri),
        language: editor.document.languageId,
        lines: lines,
        size: text.length,
        timestamp: Date.now()
    };
    vscode.window.setStatusBarMessage(`A.R.I.A: Scanning Hardware Context...`);
    const hwInfo = await hardwareContext_1.HardwareContext.scan();
    // 2. Prepare AI Input
    const aiInput = {
        source: 'selection',
        code: text,
        language: result.language || 'text',
        filePath: result.filePath || 'unknown',
        hardwareContext: hwInfo.summary
    };
    vscode.window.setStatusBarMessage(`A.R.I.A: Analyzing with AI...`);
    // 3. Call AI (Silent)
    const aiResult = await geminiClient_1.GeminiClient.analyzeCode(aiInput);
    // 4. Log Structured Output
    logger_1.Logger.logStructured('AI Analysis Complete', {
        File: result.filePath,
        Lines: result.lines,
        Hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None",
        Issues: aiResult.detectedIssues.length,
        Recommendations: aiResult.recommendations.length,
        Confidence: aiResult.confidence,
        Summary: aiResult.summary
    });
    logger_1.Logger.show();
    vscode.window.showInformationMessage(`A.R.I.A: Analysis Complete (${aiResult.detectedIssues.length} issues found)`);
    vscode.window.setStatusBarMessage(`A.R.I.A: Analysis Complete`, 3000);
    // Send to Webview Panel
    ariaPanel_1.AriaPanel.postMessage({
        type: 'showAnalysis',
        data: aiResult,
        metadata: {
            source: 'selection',
            filePath: result.filePath,
            hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None"
        }
    });
}
//# sourceMappingURL=analyzeSelection.js.map