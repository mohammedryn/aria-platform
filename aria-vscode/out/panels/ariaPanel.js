"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AriaPanel = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const logger_1 = require("../utils/logger");
const diffEngine_1 = require("../utils/diffEngine");
const editorContext_1 = require("../utils/editorContext");
const wokwiGenerator_1 = require("../simulation/wokwiGenerator");
const visionClient_1 = require("../vision/visionClient");
const geminiClient_1 = require("../ai/geminiClient");
const hardwareContext_1 = require("../context/hardwareContext");
const buildAndFlash_1 = require("../commands/buildAndFlash");
const serialManager_1 = require("../serial/serialManager");
class AriaPanel {
    get visionResult() {
        return this._currentVisionResult;
    }
    showSerialAnalysis(result) {
        this._panel.webview.postMessage({
            type: 'serialResult',
            data: result
        });
    }
    showAnalysisResult(result, metadata) {
        if (metadata?.filePath) {
            this._lastAnalyzedPath = metadata.filePath;
        }
        this._panel.webview.postMessage({
            type: 'showAnalysis',
            data: result,
            metadata: metadata
        });
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._currentVisionResult = null;
        this._lastAnalyzedPath = null;
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Listen for serial updates
        this._disposables.push(serialManager_1.SerialManager.onLogReceived((count) => {
            this._panel.webview.postMessage({
                type: 'serialStatus',
                connected: serialManager_1.SerialManager.isActive(),
                lineCount: count
            });
        }));
        // Receive messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'executeCommand':
                    this._handleCommand(message.text);
                    return;
                case 'previewDiff':
                    this._handlePreviewDiff(message.diff);
                    return;
                case 'applyDiff':
                    this._handleApplyDiff(message.diff, message.description);
                    return;
                case 'applyAllDiffs':
                    this._handleApplyAllDiffs(message.diffs);
                    return;
                case 'applyAllAndReanalyze':
                    this._handleApplyAllAndReanalyze(message.diffs);
                    return;
                case 'applyAllUntilClean':
                    this._handleApplyAllUntilClean();
                    return;
                case 'generateSimulation':
                    this._handleGenerateSimulation(message.data, message.metadata);
                    return;
                case 'openSimulation':
                    this._handleOpenSimulation(message.workspaceRoot);
                    return;
                case 'analyzeImage':
                    this.analyzeImage(message.base64);
                    return;
                case 'triggerCapture':
                    if (message.url) {
                        try {
                            fetch(message.url + '/trigger', { method: 'POST' }).catch(e => logger_1.Logger.log(`[AriaPanel] Trigger catch: ${e}`));
                        }
                        catch (err) {
                            logger_1.Logger.log(`[AriaPanel] Trigger failed: ${err}`);
                        }
                    }
                    return;
                case 'stopStream':
                    // If using CameraBridge in stream/native-python mode, we need to stop it
                    // Since CameraBridge is static, we can just call stopStream()
                    Promise.resolve().then(() => require('../vision/cameraBridge')).then(m => m.CameraBridge.stopStream());
                    return;
                case 'discardVision':
                    this._currentVisionResult = null;
                    logger_1.Logger.log("[A.R.I.A] Vision context discarded by user.");
                    return;
                case 'buildFirmware':
                    (0, buildAndFlash_1.runBuild)();
                    return;
                case 'flashFirmware':
                    (0, buildAndFlash_1.runFlash)();
                    return;
                case 'getModels':
                    this._handleGetModels();
                    return;
                case 'setModel':
                    this._handleSetModel(message.model);
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.ViewColumn.Beside;
        // If we already have a panel, show it.
        if (AriaPanel.currentPanel) {
            AriaPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel('ariaPanel', 'A.R.I.A. Copilot', column, {
            // Enable javascript in the webview
            enableScripts: true,
            // Keep the state (chat history) alive when the tab is hidden
            retainContextWhenHidden: true,
            // And restrict the webview to only loading content from our extension's `media` directory.
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
        });
        AriaPanel.currentPanel = new AriaPanel(panel, extensionUri);
    }
    static postMessage(message) {
        if (AriaPanel.currentPanel) {
            if (message?.type === 'showAnalysis' && message?.metadata?.filePath) {
                AriaPanel.currentPanel._lastAnalyzedPath = message.metadata.filePath;
            }
            AriaPanel.currentPanel._panel.webview.postMessage(message);
        }
    }
    dispose() {
        AriaPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    async _handleGetModels() {
        const config = vscode.workspace.getConfiguration('aria');
        const apiKey = config.get('apiKey') || process.env.GEMINI_API_KEY;
        const selected = config.get('apiModel') || "";
        if (!apiKey) {
            this._panel.webview.postMessage({ type: 'modelList', models: [], selected, error: 'API key missing' });
            return;
        }
        try {
            const models = await geminiClient_1.GeminiClient.listAvailableModels(apiKey);
            this._panel.webview.postMessage({ type: 'modelList', models, selected });
        }
        catch (e) {
            this._panel.webview.postMessage({ type: 'modelList', models: [], selected, error: String(e) });
        }
    }
    async _handleSetModel(model) {
        if (!model)
            return;
        const config = vscode.workspace.getConfiguration('aria');
        await config.update('apiModel', model, vscode.ConfigurationTarget.Global);
        logger_1.Logger.log(`[A.R.I.A] Model set to: ${model}`);
        this._panel.webview.postMessage({ type: 'modelSelected', model });
    }
    _getHtmlForWebview(webview) {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'aria-panel.html');
        let htmlContent = "";
        try {
            htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
        }
        catch (e) {
            logger_1.Logger.log(`Error loading HTML: ${e}`);
            htmlContent = `<h1>Error loading panel</h1>`;
        }
        return htmlContent;
    }
    async _handlePreviewDiff(diff) {
        const targetUri = (await this._resolveTargetFromDiff(diff)) ?? (await this._getFallbackTargetUri());
        const editor = (0, editorContext_1.getLastActiveEditor)();
        const document = targetUri ? await vscode.workspace.openTextDocument(targetUri) : editor?.document;
        if (!document) {
            vscode.window.showErrorMessage("A.R.I.A: No active file to apply preview.");
            return;
        }
        const originalText = document.getText();
        let patchedText = null;
        if (this._isValidUnifiedDiff(diff)) {
            patchedText = diffEngine_1.DiffEngine.applyPatch(originalText, diff);
        }
        else {
            // Full Content Mode
            patchedText = diff;
        }
        if (patchedText === null) {
            vscode.window.showErrorMessage("A.R.I.A: Failed to generate diff preview. The file may have changed.");
            return;
        }
        // Create Temp Files
        const tmpDir = os.tmpdir();
        const originalFile = path.join(tmpDir, `aria_original_${Date.now()}.cpp`); // simplified extension assumption
        const modifiedFile = path.join(tmpDir, `aria_modified_${Date.now()}.cpp`);
        try {
            fs.writeFileSync(originalFile, originalText);
            fs.writeFileSync(modifiedFile, patchedText);
            const originalUri = vscode.Uri.file(originalFile);
            const modifiedUri = vscode.Uri.file(modifiedFile);
            await vscode.commands.executeCommand("vscode.diff", originalUri, modifiedUri, "A.R.I.A Suggestion Preview");
        }
        catch (e) {
            logger_1.Logger.log(`[AriaPanel] Preview error: ${e}`);
        }
    }
    async _handleApplyDiff(diff, description) {
        const isUnified = this._isValidUnifiedDiff(diff);
        const payload = isUnified ? this._sanitizeUnifiedDiff(diff) : diff;
        if (!payload) {
            vscode.window.showErrorMessage("A.R.I.A: Invalid diff. Skipping apply.");
            return;
        }
        const success = await this._applyDiff(payload);
        if (success) {
            logger_1.Logger.log(`[A.R.I.A] Applied suggestion: ${description}`);
            vscode.window.showInformationMessage(`A.R.I.A: Applied fix - ${description}`);
        }
        else {
            vscode.window.showErrorMessage("A.R.I.A: Failed to apply edits.");
        }
    }
    async _resolveTargetFromDiff(diff) {
        const minusMatch = diff.match(/^---\s+(.+)$/m);
        const plusMatch = diff.match(/^\+\+\+\s+(.+)$/m);
        const rawPath = (plusMatch?.[1] || minusMatch?.[1] || "").trim();
        if (!rawPath || rawPath === "/dev/null")
            return undefined;
        return this._resolveTargetFromPath(rawPath);
    }
    async _resolveTargetFromPath(rawPath) {
        let normalizedPath = rawPath.replace(/^[ab]\//, '').replace(/^"+|"+$/g, '');
        if (!normalizedPath)
            return undefined;
        if (path.isAbsolute(normalizedPath)) {
            return vscode.Uri.file(normalizedPath);
        }
        const roots = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [];
        for (const root of roots) {
            const candidate = path.join(root, normalizedPath);
            if (fs.existsSync(candidate)) {
                return vscode.Uri.file(candidate);
            }
        }
        const normalized = normalizedPath.replace(/\\/g, '/');
        const directMatches = await vscode.workspace.findFiles(normalized, '**/node_modules/**', 1);
        if (directMatches.length > 0) {
            return directMatches[0];
        }
        const wildcardMatches = await vscode.workspace.findFiles(`**/${normalized}`, '**/node_modules/**', 1);
        if (wildcardMatches.length > 0) {
            return wildcardMatches[0];
        }
        return undefined;
    }
    async _getFallbackTargetUri() {
        if (!this._lastAnalyzedPath)
            return undefined;
        return this._resolveTargetFromPath(this._lastAnalyzedPath);
    }
    async _applyDiff(diff) {
        const targetUri = (await this._resolveTargetFromDiff(diff)) ?? (await this._getFallbackTargetUri());
        const editor = (0, editorContext_1.getLastActiveEditor)();
        const document = targetUri ? await vscode.workspace.openTextDocument(targetUri) : editor?.document;
        if (!document) {
            return false;
        }
        const originalText = document.getText();
        let newText = "";
        // CHECK: Is this a Unified Diff or Full Content?
        if (this._isValidUnifiedDiff(diff)) {
            const patched = diffEngine_1.DiffEngine.applyPatch(originalText, diff);
            if (patched === null)
                return false;
            newText = patched;
        }
        else {
            // Assume Full Content Rewrite
            // Basic safety check: Ensure it's not empty and looks like code
            if (diff.length < 10)
                return false;
            newText = diff;
        }
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(originalText.length));
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, fullRange, newText);
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            await document.save();
        }
        return success;
    }
    async _handleApplyAllDiffs(diffs) {
        if (!diffs || diffs.length === 0) {
            vscode.window.showErrorMessage("A.R.I.A: No fixes to apply.");
            return;
        }
        let applied = 0;
        let failed = 0;
        for (const diff of diffs) {
            const isUnified = this._isValidUnifiedDiff(diff);
            const payload = isUnified ? this._sanitizeUnifiedDiff(diff) : diff;
            if (!payload) {
                failed++;
                continue;
            }
            const success = await this._applyDiff(payload);
            if (success) {
                applied++;
            }
            else {
                failed++;
            }
        }
        logger_1.Logger.log(`[A.R.I.A] Applied fixes: ${applied}, failed: ${failed}`);
        if (failed > 0) {
            vscode.window.showWarningMessage(`A.R.I.A: Applied ${applied} fixes, ${failed} failed.`);
            this._panel.webview.postMessage({
                type: 'analysisError',
                error: `Applied ${applied} fixes, but ${failed} failed. Please review manually.`
            });
        }
        else {
            // Success! Send message to UI
            this._panel.webview.postMessage({
                type: 'successMessage',
                text: '<strong>✅ Fixed it.</strong> Code updated successfully.'
            });
            // Also clear the analysis result from UI to reduce clutter? 
            // The user said "give me a msg saying fixed it", implying they want to see that.
        }
    }
    async _handleApplyAllAndReanalyze(diffs) {
        await this._handleApplyAllDiffs(diffs);
        // The _handleApplyAllDiffs now sends a success message.
        // But since we are re-analyzing immediately, we might want to override that or just let the new analysis replace it.
        vscode.commands.executeCommand('aria.analyzeFile');
    }
    async _handleApplyAllUntilClean() {
        const maxIterations = 5;
        this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Auto-fixing code...' });
        for (let i = 0; i < maxIterations; i++) {
            const editor = (0, editorContext_1.getLastActiveEditor)();
            if (!editor) {
                this._panel.webview.postMessage({ type: 'analysisError', error: 'No active file.' });
                return;
            }
            const document = editor.document;
            const hwInfo = await hardwareContext_1.HardwareContext.scan();
            const aiInput = {
                source: 'file',
                code: document.getText(),
                language: document.languageId || 'text',
                filePath: vscode.workspace.asRelativePath(document.uri),
                hardwareContext: hwInfo.summary
            };
            // Vision context logic...
            if (this._currentVisionResult) {
                // Fixed: Removed 'visionContext' property that doesn't exist on AnalysisInput
                // The vision context string should be appended to the prompt or handled inside analyzeCode
                // But wait, AnalysisInput DOES have visionContext in geminiClient.ts?
                // Let's check the type definition.
                // Assuming it was fixed or I need to fix it. 
                // The previous read showed:
                // interface AnalysisInput { ... visionContext?: { ... } }
                // So I will keep it but ensure types match.
                aiInput.visionContext = {
                    boards: this._currentVisionResult.detectedBoards,
                    components: this._currentVisionResult.detectedComponents,
                    confidence: this._currentVisionResult.confidence
                };
            }
            // Silent analysis - DO NOT post 'showAnalysis'
            const result = await geminiClient_1.GeminiClient.analyzeCode(aiInput);
            if (!result.suggestions || result.suggestions.length === 0 || result.detectedIssues.length === 0) {
                this._panel.webview.postMessage({
                    type: 'successMessage',
                    text: '<strong>✅ Fixed it.</strong> Code is clean.'
                });
                return;
            }
            // Batch apply all suggestions
            let appliedInThisRound = 0;
            for (const suggestion of result.suggestions) {
                const isUnified = this._isValidUnifiedDiff(suggestion.diff);
                const payload = isUnified ? this._sanitizeUnifiedDiff(suggestion.diff) : suggestion.diff;
                if (!payload)
                    continue;
                const success = await this._applyDiff(payload);
                if (success)
                    appliedInThisRound++;
            }
            if (appliedInThisRound === 0) {
                // If we found issues but couldn't apply any fixes, stop to avoid infinite loop
                this._panel.webview.postMessage({
                    type: 'analysisError',
                    error: 'Could not apply remaining fixes. Please review manually.'
                });
                // Show the last analysis so user can see what's wrong
                this._panel.webview.postMessage({
                    type: 'showAnalysis',
                    data: result,
                    metadata: {
                        source: 'file',
                        filePath: aiInput.filePath,
                        hardware: hwInfo.projects.length > 0 ? hwInfo.projects[0].board : "None"
                    }
                });
                return;
            }
            // If we applied fixes, loop again to verify (Silent Re-analysis)
        }
        this._panel.webview.postMessage({
            type: 'analysisError',
            error: 'Reached max auto-fix iterations. Partial fixes applied.'
        });
    }
    _isValidUnifiedDiff(diff) {
        if (!diff)
            return false;
        const hasMinus = /^---\s+.+$/m.test(diff);
        const hasPlus = /^\+\+\+\s+.+$/m.test(diff);
        const hasHunk = /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m.test(diff);
        return hasMinus && hasPlus && hasHunk;
    }
    _sanitizeUnifiedDiff(diff) {
        if (!diff)
            return null;
        const lines = diff.split(/\r?\n/);
        let startIndex = lines.findIndex(l => l.startsWith('--- '));
        if (startIndex === -1)
            return null;
        const plusIndex = lines.findIndex((l, i) => i > startIndex && l.startsWith('+++ '));
        if (plusIndex === -1)
            return null;
        const hunkIndex = lines.findIndex((l, i) => i > plusIndex && l.startsWith('@@'));
        if (hunkIndex === -1)
            return null;
        const output = [];
        let inHunk = false;
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('```'))
                break;
            if (!inHunk) {
                if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('@@')) {
                    output.push(line);
                    if (line.startsWith('@@'))
                        inHunk = true;
                }
                continue;
            }
            if (line.startsWith(' ') ||
                line.startsWith('+') ||
                line.startsWith('-') ||
                line.startsWith('\\ No newline')) {
                output.push(line);
                continue;
            }
            if (line.startsWith('@@')) {
                output.push(line);
                continue;
            }
            if (line.trim().length === 0) {
                output.push('');
                continue;
            }
            break;
        }
        const sanitized = output.join('\n').trim();
        return this._isValidUnifiedDiff(sanitized) ? sanitized : null;
    }
    _handleGenerateSimulation(validationResult, metadata) {
        try {
            const json = wokwiGenerator_1.WokwiGenerator.generate(metadata.workspaceRoot, metadata.board, validationResult);
            // Pass metadata.board as the 3rd argument (boardId)
            wokwiGenerator_1.WokwiGenerator.createProjectFiles(metadata.workspaceRoot, json, metadata.board);
            vscode.window.showInformationMessage("A.R.I.A: Simulation files generated in .wokwi/ and wokwi.toml");
            this._panel.webview.postMessage({ type: 'simulationReady', workspaceRoot: metadata.workspaceRoot });
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Simulation generation failed: ${e}`);
            vscode.window.showErrorMessage(`A.R.I.A: Failed to generate simulation: ${e}`);
        }
    }
    async _handleOpenSimulation(workspaceRoot) {
        const diagramPath = path.join(workspaceRoot, '.wokwi', 'diagram.json');
        const uri = vscode.Uri.file(diagramPath);
        try {
            // Check if file exists
            if (!fs.existsSync(diagramPath)) {
                vscode.window.showErrorMessage("A.R.I.A: diagram.json not found.");
                return;
            }
            // Open the file so it is the active editor
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: false });
            // Check for Wokwi extension
            const wokwiExt = vscode.extensions.getExtension('Wokwi.wokwi-vscode');
            if (!wokwiExt) {
                const install = "Install Wokwi Extension";
                const choice = await vscode.window.showInformationMessage("To run this simulation, you need the Wokwi extension.", install);
                if (choice === install) {
                    vscode.env.openExternal(vscode.Uri.parse('vscode:extension/Wokwi.wokwi-vscode'));
                }
            }
            else {
                // Wait a moment for the editor to settle and extension to activate
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Directly start the simulation
                try {
                    await vscode.commands.executeCommand('wokwi.start');
                }
                catch (err) {
                    logger_1.Logger.log(`[A.R.I.A] Failed to trigger wokwi.start: ${err}`);
                    vscode.window.showWarningMessage(`A.R.I.A: Opened diagram, but could not auto-start simulation. Click 'Start Simulation' in the editor.`);
                }
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`A.R.I.A: Error opening simulation: ${e}`);
        }
    }
    _handleCommand(text) {
        logger_1.Logger.log(`User command: ${text}`);
        let response = "";
        if (text.startsWith('/')) {
            const cmd = text.split(' ')[0].toLowerCase();
            switch (cmd) {
                case '/help':
                    response = "<b>Available Commands:</b><br><code>/analyze</code> - Analyze current file<br><code>/selection</code> - Analyze selected code<br><code>/workspace</code> - Analyze entire workspace<br><code>/validate</code> - Validate Hardware & Simulate";
                    this._panel.webview.postMessage({ type: 'addResult', text: response });
                    break;
                case '/analyze':
                    vscode.commands.executeCommand('aria.analyzeFile');
                    break;
                case '/selection':
                    vscode.commands.executeCommand('aria.analyzeSelection');
                    break;
                case '/workspace':
                    vscode.commands.executeCommand('aria.analyzeWorkspace');
                    break;
                case '/validate':
                    vscode.commands.executeCommand('aria.validateHardware');
                    break;
                case '/capture':
                    vscode.commands.executeCommand('aria.captureImage');
                    break;
                default:
                    response = `Unknown command: ${cmd}`;
                    this._panel.webview.postMessage({ type: 'addResult', text: response });
            }
        }
        else {
            response = `A.R.I.A. is a command-based system. Type <code>/help</code> for options.`;
            this._panel.webview.postMessage({ type: 'addResult', text: response });
        }
    }
    async analyzeImage(base64Image) {
        try {
            vscode.window.showInformationMessage("A.R.I.A: Analyzing hardware image...");
            logger_1.Logger.log("[A.R.I.A] Starting vision analysis...");
            const result = await visionClient_1.VisionClient.analyze(base64Image);
            this._currentVisionResult = result;
            // Context Comparison
            const editor = (0, editorContext_1.getLastActiveEditor)();
            let mismatchWarning;
            if (editor) {
                const workspaceRoot = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
                if (workspaceRoot) {
                    const pioContext = await hardwareContext_1.HardwareContext.getPlatformIOContext(workspaceRoot);
                    if (pioContext && pioContext.board) {
                        const pioBoard = pioContext.board.toLowerCase().replace(/_/g, ' ');
                        const visionBoards = result.detectedBoards.map(b => b.toLowerCase());
                        // Simple fuzzy check: Does any vision board string contain parts of pio board or vice versa?
                        // e.g. "teensy41" vs "teensy 4.1"
                        const match = visionBoards.some(vb => vb.includes(pioBoard) || pioBoard.includes(vb) ||
                            (vb.includes('arduino') && pioBoard.includes('uno')) // common alias
                        );
                        if (visionBoards.length > 0 && !match) {
                            mismatchWarning = `Vision sees "${result.detectedBoards.join(', ')}" but PlatformIO configures "${pioContext.board}".`;
                            logger_1.Logger.log(`[A.R.I.A] Vision Mismatch: ${mismatchWarning}`);
                        }
                    }
                }
            }
            logger_1.Logger.log(`[A.R.I.A] Vision confidence: ${result.confidence}`);
            logger_1.Logger.log(`[A.R.I.A] Vision used as advisory context only`);
            this._panel.webview.postMessage({
                type: 'visionResult',
                data: { ...result, mismatchWarning }
            });
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Vision handling error: ${e}`);
            vscode.window.showErrorMessage(`A.R.I.A: Vision analysis failed: ${e}`);
        }
    }
}
exports.AriaPanel = AriaPanel;
//# sourceMappingURL=ariaPanel.js.map