import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisResult } from '../types';
import { AriaPanel } from '../panels/ariaPanel';

export async function analyzeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('A.R.I.A: No workspace open.');
        return;
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "A.R.I.A: Analyzing Workspace...",
        cancellable: false
    }, async (progress) => {
        const root = workspaceFolders[0];
        // Simple scan, limited depth/files for this step
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 200);
        
        const extensionCount: Record<string, number> = {};
        for (const file of files) {
            const ext = file.path.split('.').pop() || 'unknown';
            extensionCount[ext] = (extensionCount[ext] || 0) + 1;
        }

        const result: AnalysisResult = {
            source: 'workspace',
            size: files.length,
            timestamp: Date.now(),
            metadata: {
                root: root.name,
                extensionSummary: extensionCount
            }
        };

        Logger.logStructured('AnalyzeWorkspace', {
            Root: root.name,
            Files: files.length,
            Extensions: JSON.stringify(extensionCount)
        });

        Logger.show();
        vscode.window.setStatusBarMessage(`A.R.I.A: Workspace scanned (${files.length} files)`, 3000);

        // Send to Webview Panel
        const panelHtml = `
            <div style="border-left: 3px solid var(--vscode-notebook-cellBorderColor); padding-left: 10px;">
                <h3>📂 Workspace Scan</h3>
                <p>Root: <b>${root.name}</b></p>
                <p>Files Scanned: ${files.length}</p>
                <div style="margin-top: 10px;">
                    <strong>Extensions Found:</strong>
                    <pre style="background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px;">${JSON.stringify(extensionCount, null, 2)}</pre>
                </div>
            </div>
        `;
        AriaPanel.postMessage({ type: 'addResult', text: panelHtml });
    });
}
