import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisResult } from '../types'; // Keep this for legacy or logging if needed, but we rely on GeminiClient return type
import { AriaPanel } from '../panels/ariaPanel';
import { GeminiClient } from '../ai/geminiClient';
import { HardwareContext } from '../context/hardwareContext';
import * as path from 'path';

export async function analyzeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('A.R.I.A: No workspace open.');
        return;
    }

    // Ensure panel is open to show results
    if (!AriaPanel.currentPanel) {
        vscode.commands.executeCommand('aria.openPanel');
        // Wait a bit for panel to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "A.R.I.A: Analyzing Full Workspace...",
        cancellable: true
    }, async (progress, token) => {
        try {
            const root = workspaceFolders[0];
            progress.report({ message: "Scanning files...", increment: 10 });

            // 1. Find relevant source files
            // Limit to common embedded/web source extensions
            const includePattern = '**/*.{cpp,c,h,hpp,ino,py,ini,json,ts,js,md,txt}';
            const excludePattern = '**/{node_modules,.git,build,.pio,dist,out,venv}/**';
            
            const uris = await vscode.workspace.findFiles(includePattern, excludePattern, 50); // Limit to 50 files to avoid token overflow
            
            if (uris.length === 0) {
                vscode.window.showWarningMessage("A.R.I.A: No source files found to analyze.");
                return;
            }

            progress.report({ message: `Reading ${uris.length} files...`, increment: 20 });

            const files: { path: string; content: string }[] = [];
            let totalBytes = 0;
            const MAX_BYTES = 100000; // 100KB limit for now to be safe with standard context

            for (const uri of uris) {
                if (token.isCancellationRequested) return;

                try {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    const content = doc.getText();
                    
                    // Skip very large files or minified code
                    if (content.length > 50000) continue; 

                    totalBytes += content.length;
                    if (totalBytes > MAX_BYTES) {
                        Logger.log(`[AnalyzeWorkspace] Context limit reached. Stopping at ${files.length} files.`);
                        break; 
                    }

                    files.push({
                        path: vscode.workspace.asRelativePath(uri),
                        content: content
                    });
                } catch (e) {
                    Logger.log(`[AnalyzeWorkspace] Failed to read ${uri.fsPath}: ${e}`);
                }
            }

            // 2. Get Hardware Context
            progress.report({ message: "Scanning hardware context...", increment: 20 });
            const hwInfo = await HardwareContext.scan();

            // 3. Get Vision Context (if available)
            const visionResult = AriaPanel.currentPanel?.visionResult;
            const visionContext = visionResult ? {
                boards: visionResult.detectedBoards,
                components: visionResult.detectedComponents,
                confidence: visionResult.confidence
            } : undefined;

            // 4. Call Gemini
            progress.report({ message: "AI Analysis in progress (Deep Scan)...", increment: 30 });
            
            // Notify UI we are starting
            AriaPanel.postMessage({ type: 'analysisLoading', message: 'Analyzing entire workspace...' });

            const analysis = await GeminiClient.analyzeProject(files, hwInfo.summary, visionContext);

            // 5. Send Result
            progress.report({ message: "Rendering results...", increment: 20 });
            
            // We use 'showAnalysis' which expects 'data' and 'metadata'
            // The panel handles displaying the suggestions and "Apply" buttons
            AriaPanel.postMessage({
                type: 'showAnalysis',
                data: analysis,
                metadata: {
                    source: 'workspace',
                    filePath: 'Workspace Analysis', // Virtual path
                    hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None",
                    fileCount: files.length,
                    model: (analysis as any).usedModel || "Gemini AI" // Pass the actual model used
                }
            });

            Logger.log("[AnalyzeWorkspace] Analysis complete.");
            vscode.window.setStatusBarMessage("A.R.I.A: Workspace analysis complete.", 5000);

        } catch (error) {
            Logger.log(`[AnalyzeWorkspace] Error: ${error}`);
            vscode.window.showErrorMessage(`A.R.I.A Analysis Failed: ${error}`);
            AriaPanel.postMessage({ 
                type: 'analysisError', 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    });
}
