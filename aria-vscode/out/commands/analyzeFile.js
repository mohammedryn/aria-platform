"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
const geminiClient_1 = require("../ai/geminiClient");
const hardwareContext_1 = require("../context/hardwareContext");
const ariaPanel_1 = require("../panels/ariaPanel");
const editorContext_1 = require("../utils/editorContext");
async function analyzeFile() {
    const editor = (0, editorContext_1.getLastActiveEditor)();
    if (!editor) {
        vscode.window.showWarningMessage('A.R.I.A: No active file to analyze.');
        return;
    }
    const document = editor.document;
    const text = document.getText();
    const lines = document.lineCount;
    const result = {
        source: 'file',
        filePath: vscode.workspace.asRelativePath(document.uri),
        language: document.languageId,
        lines: lines,
        size: text.length,
        timestamp: Date.now()
    };
    vscode.window.setStatusBarMessage(`A.R.I.A: Scanning Hardware Context...`);
    const hwInfo = await hardwareContext_1.HardwareContext.scan();
    vscode.window.setStatusBarMessage(`A.R.I.A: Analyzing File with AI...`);
    // Prepare AI Input
    const aiInput = {
        source: 'file',
        code: text,
        language: result.language || 'text',
        filePath: result.filePath || 'unknown',
        hardwareContext: hwInfo.summary
    };
    // Inject Vision Context if available
    if (ariaPanel_1.AriaPanel.currentPanel && ariaPanel_1.AriaPanel.currentPanel.visionResult) {
        const v = ariaPanel_1.AriaPanel.currentPanel.visionResult;
        aiInput.visionContext = {
            boards: v.detectedBoards,
            components: v.detectedComponents,
            confidence: v.confidence
        };
        logger_1.Logger.log(`[A.R.I.A] Injected Vision Context: ${v.detectedBoards.join(', ')}`);
    }
    // Call AI
    const aiResult = await geminiClient_1.GeminiClient.analyzeCode(aiInput);
    logger_1.Logger.logStructured('File Analysis Complete', {
        File: result.filePath,
        Lines: result.lines,
        Hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None",
        Issues: aiResult.detectedIssues.length,
        Recommendations: aiResult.recommendations.length,
        Confidence: aiResult.confidence,
        Summary: aiResult.summary
    });
    logger_1.Logger.show();
    vscode.window.showInformationMessage(`A.R.I.A: File Analysis Complete (${aiResult.detectedIssues.length} issues)`);
    vscode.window.setStatusBarMessage(`A.R.I.A: File Analysis Complete`, 3000);
    // Send to Webview Panel
    ariaPanel_1.AriaPanel.postMessage({
        type: 'showAnalysis',
        data: aiResult,
        metadata: {
            source: 'file',
            filePath: result.filePath,
            hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None"
        }
    });
}
//# sourceMappingURL=analyzeFile.js.map