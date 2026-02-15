"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AriaPanel = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const chatManager_1 = require("../chat/chatManager");
const logger_1 = require("../utils/logger");
const diffEngine_1 = require("../utils/diffEngine");
const editorContext_1 = require("../utils/editorContext");
const wokwiGenerator_1 = require("../simulation/wokwiGenerator");
const visionClient_1 = require("../vision/visionClient");
const geminiClient_1 = require("../ai/geminiClient");
const hardwareContext_1 = require("../context/hardwareContext");
const buildAndFlash_1 = require("../commands/buildAndFlash");
const platformioManager_1 = require("../firmware/platformioManager");
const serialManager_1 = require("../serial/serialManager");
const patchedContentProvider_1 = require("../utils/patchedContentProvider");
const cameraBridge_1 = require("../vision/cameraBridge");
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
    async startVideoCapture() {
        try {
            const videoPath = await cameraBridge_1.CameraBridge.recordVideo((url) => {
                this._panel.webview.postMessage({
                    command: 'showStream',
                    url: url,
                    mode: 'video'
                });
            });
            if (videoPath) {
                await this.processVideo(videoPath);
            }
        }
        catch (e) {
            vscode.window.showErrorMessage("Video Capture Error: " + e);
        }
    }
    async processVideo(filePath) {
        this._currentVideoPath = filePath;
        // Notify UI
        this._panel.webview.postMessage({
            type: 'videoSelected',
            filename: path.basename(filePath)
        });
        // Start Upload
        await this._uploadVideo(filePath);
    }
    constructor(panel, extensionUri, context) {
        this._disposables = [];
        this._currentVisionResult = null;
        this._currentVisionImage = null;
        this._visionReferenceActive = false;
        this._lastAnalyzedPath = null;
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chatManager = new chatManager_1.ChatManager(context);
        // Initialize Session
        const sessions = this._chatManager.getSessions();
        if (sessions.length > 0) {
            this._chatManager.setCurrentSession(sessions[0].id);
        }
        else {
            this._chatManager.createSession();
        }
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
                case 'startRecording':
                    if (message.url)
                        cameraBridge_1.CameraBridge.triggerStartRecord(message.url);
                    return;
                case 'stopRecording':
                    if (message.url)
                        cameraBridge_1.CameraBridge.triggerStopRecord(message.url);
                    return;
                case 'analyzeImage':
                    this.analyzeImage(message.base64);
                    return;
                case 'selectVideo':
                    this._handleSelectVideo();
                    return;
                case 'analyzeVideo':
                    this._handleAnalyzeVideo();
                    return;
                case 'discardVideo':
                    this._handleDiscardVideo();
                    return;
                case 'getHistory':
                    this._handleGetHistory();
                    return;
                case 'loadSession':
                    this._handleLoadSession(message.sessionId);
                    return;
                case 'newChat':
                    this._handleNewChat();
                    return;
                case 'deleteChat':
                    this._handleDeleteChat(message.sessionId);
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
                    this._currentVisionImage = null;
                    this._visionReferenceActive = false;
                    logger_1.Logger.log("[A.R.I.A] Vision context discarded by user.");
                    return;
                case 'useVisionReference':
                    this._visionReferenceActive = message.state !== false; // Default to true if undefined
                    if (this._visionReferenceActive) {
                        logger_1.Logger.log("[A.R.I.A] Vision context enabled for next chat.");
                        vscode.window.showInformationMessage("A.R.I.A: Vision Context Active. Type your question in the chat.");
                    }
                    else {
                        logger_1.Logger.log("[A.R.I.A] Vision context disabled.");
                    }
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
                case 'selectVideo':
                    this._handleSelectVideo();
                    return;
                case 'analyzeVideo':
                    this._handleAnalyzeVideo();
                    return;
                case 'discardVideo':
                    this._handleDiscardVideo();
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(context) {
        const column = vscode.ViewColumn.Beside;
        const extensionUri = context.extensionUri;
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
        AriaPanel.currentPanel = new AriaPanel(panel, extensionUri, context);
    }
    static postMessage(message) {
        if (AriaPanel.currentPanel) {
            // Update last analyzed path from metadata if present (for both analysis and chat results)
            if (message?.type === 'showAnalysis' || message?.type === 'addResult') {
                if (message?.metadata?.fullPath) {
                    AriaPanel.currentPanel._lastAnalyzedPath = message.metadata.fullPath;
                }
                else if (message?.metadata?.filePath) {
                    AriaPanel.currentPanel._lastAnalyzedPath = message.metadata.filePath;
                }
            }
            // If this is an analysis result, save it to history
            if (message?.type === 'showAnalysis' || message?.type === 'addResult' || message?.type === 'visionResult') {
                AriaPanel.currentPanel._saveAssistantMessage(message);
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
            // Restore Chat History on Load
            const currentSessionId = this._chatManager.getCurrentSessionId();
            if (currentSessionId) {
                const session = this._chatManager.getSession(currentSessionId);
                // Send with isInit flag so frontend knows not to wipe locally restored state if empty
                if (session) {
                    this._panel.webview.postMessage({ type: 'loadChat', session: session, isInit: true });
                }
            }
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
        // Virtual Diff Provider Logic
        try {
            if (!targetUri) {
                vscode.window.showErrorMessage("A.R.I.A: Cannot preview diff - Target file not found.");
                return;
            }
            // Create a virtual URI for the "Suggested" side
            // format: aria-preview://host/filename.ext (Suggested)
            const filename = path.basename(targetUri.fsPath);
            const previewUri = vscode.Uri.parse(`${patchedContentProvider_1.PatchedContentProvider.scheme}:/${filename} (Suggested)`);
            // Update the content in our provider
            patchedContentProvider_1.PatchedContentProvider.getInstance().setContent(previewUri, patchedText);
            // Command: vscode.diff(left, right, title)
            await vscode.commands.executeCommand("vscode.diff", targetUri, // Left side: Actual file on disk
            previewUri, // Right side: Virtual patched content
            `${filename} (Original ↔ Suggestion)`);
        }
        catch (e) {
            logger_1.Logger.log(`[AriaPanel] Preview error: ${e}`);
            vscode.window.showErrorMessage(`A.R.I.A: Preview failed: ${e}`);
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
    _isSafeToApply(uri, content) {
        const filename = path.basename(uri.fsPath).toLowerCase();
        // Block C/C++ code in INI files
        if (filename.endsWith('.ini')) {
            // Check for C++ keywords
            const cppKeywords = [
                '#include',
                'void setup',
                'void loop',
                'int main',
                'class ',
                'namespace ',
                'std::',
                'using namespace'
            ];
            for (const keyword of cppKeywords) {
                if (content.includes(keyword)) {
                    logger_1.Logger.log(`[Safety] Blocked C++ code in ${filename}: Found '${keyword}'`);
                    return false;
                }
            }
        }
        return true;
    }
    async _applyDiff(diff) {
        const targetUri = (await this._resolveTargetFromDiff(diff)) ?? (await this._getFallbackTargetUri());
        logger_1.Logger.log(`[A.R.I.A] ApplyDiff Target: ${targetUri?.fsPath ?? 'undefined'}`);
        if (!targetUri) {
            logger_1.Logger.log(`[A.R.I.A] ApplyDiff Failed: No target URI resolved.`);
            return false;
        }
        // Safety Check 1: Prevent overwriting config files with C++ code
        if (!this._isSafeToApply(targetUri, diff)) {
            const msg = `Safety Block: Attempted to write C/C++ code to a configuration file (${path.basename(targetUri.fsPath)}). Operation aborted.`;
            logger_1.Logger.log(`[A.R.I.A] ${msg}`);
            vscode.window.showErrorMessage(`A.R.I.A: ${msg}`);
            return false;
        }
        const editor = (0, editorContext_1.getLastActiveEditor)();
        const document = targetUri ? await vscode.workspace.openTextDocument(targetUri) : editor?.document;
        if (!document) {
            logger_1.Logger.log(`[A.R.I.A] ApplyDiff Failed: No document found.`);
            return false;
        }
        const originalText = document.getText();
        let newText = "";
        // Check Diff Type
        if (this._isValidUnifiedDiff(diff)) {
            logger_1.Logger.log(`[A.R.I.A] Applying Unified Diff...`);
            // IMPORTANT: Sanitize common formatting issues before applying
            // - Ensure header paths are clean (remove quotes)
            // - Ensure context lines start with space if missing (common AI error)
            const patched = diffEngine_1.DiffEngine.applyPatch(originalText, diff);
            if (patched === null) {
                logger_1.Logger.log(`[A.R.I.A] ApplyDiff Failed: Patching returned null.`);
                return false;
            }
            newText = patched;
        }
        else {
            // Assume Full Content Rewrite logic... BUT CHECK FOR DANGEROUS DIFF FRAGMENTS
            // If the content is NOT a valid diff but LOOKS like one (contains hunk headers or diff markers), 
            // DO NOT WRITE IT as full content. This is the root cause of the "code corruption" bug.
            const looksLikeDiff = /^@@\s+-\d/m.test(diff) || /^\+\+\+\s+/m.test(diff) || /^---\s+/m.test(diff);
            if (looksLikeDiff) {
                const msg = `Safety Block: Content looks like a malformed diff but failed validation. Aborting full rewrite to prevent corruption.`;
                logger_1.Logger.log(`[A.R.I.A] ${msg}`);
                vscode.window.showErrorMessage(`A.R.I.A: Fix failed validation as a proper diff. Please regenerate.`);
                return false;
            }
            logger_1.Logger.log(`[A.R.I.A] Applying Full Rewrite (${diff.length} bytes)...`);
            // Basic safety check: Ensure it's not empty and looks like code
            if (diff.length < 10) {
                logger_1.Logger.log(`[A.R.I.A] ApplyDiff Failed: Content too short.`);
                return false;
            }
            // Strip diff headers if present but unmatched by validation? (Should be caught by looksLikeDiff now)
            // But just in case, strip leading --- header block if it exists exactly
            newText = diff.replace(/^---\s+[^\r\n]+[\r\n]+\+\+\+\s+[^\r\n]+[\r\n]+/, '');
        }
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(originalText.length));
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, fullRange, newText);
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            await document.save();
            logger_1.Logger.log(`[A.R.I.A] ApplyDiff Success.`);
        }
        else {
            logger_1.Logger.log(`[A.R.I.A] ApplyDiff Failed: WorkspaceEdit declined.`);
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
            // Save to history
            this._saveAssistantMessage({
                type: 'simulationReady',
                workspaceRoot: metadata.workspaceRoot
            });
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Simulation generation failed: ${e}`);
            vscode.window.showErrorMessage(`A.R.I.A: Failed to generate simulation: ${e}`);
        }
    }
    async _handleSelectVideo() {
        const options = {
            canSelectMany: false,
            openLabel: 'Select Video',
            filters: {
                'Videos': ['mp4', 'mov', 'avi', 'webm', 'mpeg', 'mpg']
            }
        };
        const fileUri = await vscode.window.showOpenDialog(options);
        if (!fileUri || fileUri.length === 0) {
            return;
        }
        const filePath = fileUri[0].fsPath;
        this._currentVideoPath = filePath;
        const filename = path.basename(filePath);
        // Notify UI
        this._panel.webview.postMessage({
            type: 'videoSelected',
            filename: filename
        });
        // Start Upload in background
        this._uploadVideo(filePath);
    }
    async _uploadVideo(filePath) {
        try {
            // Determine mime type
            const ext = path.extname(filePath).toLowerCase();
            let mime = 'video/mp4';
            if (ext === '.mov')
                mime = 'video/quicktime';
            if (ext === '.avi')
                mime = 'video/x-msvideo';
            if (ext === '.webm')
                mime = 'video/webm';
            if (ext === '.mpeg' || ext === '.mpg')
                mime = 'video/mpeg';
            this._panel.webview.postMessage({ type: 'videoStatus', status: 'Uploading to Gemini...', ready: false });
            const uri = await geminiClient_1.GeminiClient.uploadFile(filePath, mime);
            this._currentVideoUri = uri;
            this._panel.webview.postMessage({ type: 'videoStatus', status: 'Processing video...', ready: false });
            // Wait for active
            await geminiClient_1.GeminiClient.waitForFileActive(uri);
            this._panel.webview.postMessage({ type: 'videoStatus', status: 'Ready to Analyze', ready: true });
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Video upload error: ${e}`);
            this._panel.webview.postMessage({ type: 'videoStatus', status: 'Upload Failed. Check logs.', error: true, ready: false });
        }
    }
    async _handleAnalyzeVideo() {
        if (!this._currentVideoUri) {
            vscode.window.showErrorMessage("Video not ready yet.");
            return;
        }
        // Show loading in main chat
        this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Analyzing video (Gemini 3 Pro)...' });
        try {
            const ext = path.extname(this._currentVideoPath || "").toLowerCase();
            let mime = 'video/mp4';
            if (ext === '.mov')
                mime = 'video/quicktime';
            if (ext === '.avi')
                mime = 'video/x-msvideo';
            if (ext === '.webm')
                mime = 'video/webm';
            const result = await geminiClient_1.GeminiClient.analyzeVideo(this._currentVideoUri, mime, "Analyze this video. Identify the hardware, board, and connections. If you see any obvious issues or bugs in the setup, point them out.");
            this._panel.webview.postMessage({
                type: 'showAnalysis',
                data: result,
                metadata: {
                    source: 'video-analysis',
                    filePath: this._currentVideoPath,
                    model: 'gemini-3-pro-preview'
                }
            });
        }
        catch (e) {
            this._panel.webview.postMessage({
                type: 'analysisError',
                error: `Video analysis failed: ${e instanceof Error ? e.message : String(e)}`
            });
        }
    }
    _handleDiscardVideo() {
        this._currentVideoPath = undefined;
        this._currentVideoUri = undefined;
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
    async _handleInitProject(boardHint) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this._panel.webview.postMessage({ type: 'analysisError', error: "Error: No workspace open. Please open a folder first." });
            return;
        }
        const root = workspaceFolders[0].uri.fsPath;
        let boardInput = boardHint.trim();
        if (!boardInput) {
            boardInput = await vscode.window.showInputBox({
                prompt: "Enter board name (e.g., Arduino Nano, ESP32, Teensy 4.1)",
                placeHolder: "arduino nano"
            }) || "";
        }
        if (!boardInput) {
            this._panel.webview.postMessage({ type: 'addResult', text: "PlatformIO setup cancelled: No board specified." });
            return;
        }
        // Resolve natural language board name to PlatformIO ID
        this._panel.webview.postMessage({ type: 'analysisLoading', message: `Resolving "${boardInput}"...` });
        const board = await platformioManager_1.PlatformIOManager.resolveBoardId(boardInput);
        if (!board) {
            this._panel.webview.postMessage({ type: 'analysisError', error: `Could not recognize board "${boardInput}". Try a specific PlatformIO board ID (e.g., nanoatmega328, esp32dev).` });
            return;
        }
        logger_1.Logger.log(`[A.R.I.A] Resolved "${boardInput}" → "${board}"`);
        this._panel.webview.postMessage({ type: 'analysisLoading', message: `Initializing PlatformIO for ${board}...` });
        const success = await platformioManager_1.PlatformIOManager.initProject(board, root);
        if (success) {
            this._panel.webview.postMessage({ type: 'addResult', text: `<b>PlatformIO Initialized!</b><br>Board: ${board}<br>Framework: Arduino<br>Verifying build...` });
            // Run Build to verify
            const buildResult = await platformioManager_1.PlatformIOManager.buildFirmware(root);
            if (buildResult.success) {
                this._panel.webview.postMessage({ type: 'successMessage', text: `<strong>✅ Ready to Flash!</strong><br>Project initialized and built successfully.` });
            }
            else {
                this._panel.webview.postMessage({ type: 'analysisError', error: `Project initialized but build failed. See Output Channel for details.` });
            }
        }
        else {
            this._panel.webview.postMessage({ type: 'analysisError', error: "PlatformIO Init Failed. Check logs." });
        }
    }
    async _handleExplainCommand(prompt) {
        this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Analyzing Project Context & Generating Explanation...' });
        try {
            logger_1.Logger.log(`[A.R.I.A] Generating Video Explanation for: ${prompt}`);
            let finalPrompt = `User Question: "${prompt}"\n\n`;
            // CONTEXT AWARENESS: Always scan for context to make explanation specific
            try {
                // 1. Hardware Scan
                const hw = await hardwareContext_1.HardwareContext.scan();
                let boardName = "Generic Microcontroller";
                if (hw.projects.length > 0) {
                    boardName = `${hw.projects[0].board} (${hw.projects[0].framework})`;
                }
                // 2. Deep Source Scan (Read src/ files)
                let codeSnippet = "";
                const srcFiles = await vscode.workspace.findFiles('src/**/*.{cpp,ino,c,h,hpp,S}', '**/node_modules/**', 10);
                if (srcFiles.length > 0) {
                    logger_1.Logger.log(`[A.R.I.A] Found ${srcFiles.length} source files for explanation context.`);
                    for (const file of srcFiles) {
                        try {
                            const doc = await vscode.workspace.openTextDocument(file);
                            const text = doc.getText();
                            codeSnippet += `\n// --- File: ${vscode.workspace.asRelativePath(file)} ---\n${text.substring(0, 1500)}\n`;
                        }
                        catch (e) {
                            logger_1.Logger.log(`[A.R.I.A] Failed to read ${file.fsPath}: ${e}`);
                        }
                    }
                }
                else {
                    const editor = (0, editorContext_1.getLastActiveEditor)();
                    if (editor) {
                        codeSnippet = `// --- Active File ---\n${editor.document.getText().substring(0, 2000)}`;
                    }
                }
                if (!codeSnippet)
                    codeSnippet = "// No source code found.";
                // 3. Inject Context
                finalPrompt += `CONTEXT:\n` +
                    `- Target Hardware: ${boardName}\n` +
                    `- Project Source Code:\n\`\`\`cpp\n${codeSnippet}\n\`\`\`\n\n` +
                    `INSTRUCTION: Explain the concept specifically in the context of this project's code and hardware. ` +
                    `If the user asks "how does this work", refer to specific functions and pins in the provided code. ` +
                    `If the user asks "how to wire", use the specific pins defined in the code.`;
            }
            catch (contextError) {
                logger_1.Logger.log(`[A.R.I.A] Failed to gather context for explanation: ${contextError}`);
                // Fallback to original prompt if context fails
                finalPrompt = prompt;
            }
            const htmlContent = await geminiClient_1.GeminiClient.generateVideoScript(finalPrompt);
            if (htmlContent) {
                this._panel.webview.postMessage({
                    type: 'addResult',
                    text: `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; bg: #000; border: 2px solid #55ff55; box-shadow: 0 0 10px #55ff55;">
                        <iframe srcdoc="${htmlContent.replace(/"/g, '&quot;')}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" sandbox="allow-scripts allow-same-origin"></iframe>
                    </div>
                    <div style="margin-top:5px; font-size:0.8em; color:#aaa;">Result generated by Gemini 3 Pro (Simulated Video)</div>`
                });
            }
            else {
                this._panel.webview.postMessage({ type: 'analysisError', error: "Video generation returned empty." });
            }
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Explain CMD Failed: ${e}`);
            this._panel.webview.postMessage({ type: 'analysisError', error: `Explain Failed: ${e}` });
        }
    }
    async _handleGenerateImage(prompt) {
        this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Generating Schematic with Gemini 3 Pro Preview...' });
        try {
            logger_1.Logger.log(`[A.R.I.A] Generating Schematic for prompt: ${prompt}`);
            let finalPrompt = `Circuit: ${prompt}. Ensure all connections are logical and professional.`;
            // CONTEXT AWARENESS: Check if user refers to current project/workspace/code
            const contextTriggerRegex = /(?:this|current|my)\s+(?:project|workspace|code|file)/i;
            if (contextTriggerRegex.test(prompt)) {
                logger_1.Logger.log('[A.R.I.A] Context-Aware Schematic Requested (Deep Scan)');
                this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Analyzing Project Source & Hardware...' });
                try {
                    // 1. Hardware Scan (Board Type)
                    const hw = await hardwareContext_1.HardwareContext.scan();
                    let boardName = "Generic Microcontroller";
                    let boardFramework = "Arduino";
                    if (hw.projects.length > 0) {
                        boardName = hw.projects[0].board;
                        boardFramework = hw.projects[0].framework;
                    }
                    // 2. Deep Source Scan (Read src/ files)
                    let codeSnippet = "";
                    // Find up to 10 source files to cover headers and implementation
                    const srcFiles = await vscode.workspace.findFiles('src/**/*.{cpp,ino,c,h,hpp,S}', '**/node_modules/**', 10);
                    if (srcFiles.length > 0) {
                        logger_1.Logger.log(`[A.R.I.A] Found ${srcFiles.length} source files for context.`);
                        for (const file of srcFiles) {
                            try {
                                const doc = await vscode.workspace.openTextDocument(file);
                                const text = doc.getText();
                                // Take first 2000 chars per file to stay within limits but capture definitions
                                codeSnippet += `\n// --- File: ${vscode.workspace.asRelativePath(file)} ---\n${text.substring(0, 2000)}\n`;
                            }
                            catch (e) {
                                logger_1.Logger.log(`[A.R.I.A] Failed to read ${file.fsPath}: ${e}`);
                            }
                        }
                    }
                    else {
                        // Fallback to active editor if no src structure found
                        const editor = (0, editorContext_1.getLastActiveEditor)();
                        if (editor) {
                            codeSnippet = `// --- Active File ---\n${editor.document.getText().substring(0, 4000)}`;
                        }
                    }
                    if (!codeSnippet)
                        codeSnippet = "// No matching source code found in workspace.";
                    // 3. Inject Context into Prompt - STRONG INSTRUCTION
                    finalPrompt = `STRICT INSTRUCTION: You are generating a schematic for a SPECIFIC implementation. DO NOT generate a generic example.\n\n` +
                        `User Request: "${prompt}"\n\n` +
                        `MUST USE THESE EXACT SPECS:\n` +
                        `- Microcontroller: ${boardName} (${boardFramework})\n` +
                        `- Pin Connections: YOU MUST READ THE CODE BELOW TO FIND PIN ASSIGNMENTS.\n` +
                        `  - Look for 'const int', '#define', or 'pinMode'.\n` +
                        `  - Check header files (.h) for pin definitions if not in main.cpp.\n` +
                        `  - Example: If code says 'led = 25', you MUST wire the LED to Pin 25.\n\n` +
                        `PROJECT SOURCE CODE:\n\`\`\`cpp\n${codeSnippet}\n\`\`\`\n\n` +
                        `VISUALIZATION RULES:\n` +
                        `- Draw the specific board mentioned (${boardName}).\n` +
                        `- Draw wires EXACTLY as defined in the source code.\n` +
                        `- Label all pins and components clearly.\n` +
                        `- If a pin is defined in code but not standard on the board, adding a note or custom label is acceptable, but try to map to physical pins of ${boardName}.`;
                }
                catch (contextError) {
                    logger_1.Logger.log(`[A.R.I.A] Failed to gather context: ${contextError}`);
                }
            }
            // Use Gemini 3 Pro (Hybrid Image/SVG Mode)
            const result = await geminiClient_1.GeminiClient.generateSchematicSVG(finalPrompt);
            if (result) {
                logger_1.Logger.log('[A.R.I.A] Schematic generation successful');
                // Detect type
                const isSvg = result.trim().startsWith('<svg');
                this._panel.webview.postMessage({
                    type: 'showImage',
                    image: result,
                    isSvg: isSvg,
                    prompt: prompt,
                    metadata: {
                        model: 'gemini-3-pro-image-preview'
                    }
                });
                // Save to history
                this._saveAssistantMessage({
                    type: 'showImage',
                    image: result, // We save the base64/SVG content directly. For large history this is heavy, but simple.
                    isSvg: isSvg,
                    prompt: prompt,
                    metadata: { model: 'gemini-3-pro-image-preview' }
                });
            }
            else {
                logger_1.Logger.log('[A.R.I.A] Schematic generation returned null');
                this._panel.webview.postMessage({ type: 'analysisError', error: "Schematic generation returned no results." });
            }
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Schematic Gen Failed: ${e}`);
            this._panel.webview.postMessage({ type: 'analysisError', error: `Schematic Gen Failed: ${e}` });
        }
    }
    async _handleCommand(text) {
        text = text.trim();
        logger_1.Logger.log(`User command: ${text}`);
        this._saveUserMessage(text);
        // 0. Check for Image Generation Intent - PRIORITY
        // Matches "generate ... schematic", "draw ... diagram", "create ... image" anywhere in text
        // Also catches "can you please generate..."
        const imageGenRegex = /(?:generate|draw|create|make).{0,70}(?:schematic|circuit|diagram|image|picture|pcb)/i;
        if (imageGenRegex.test(text) && !text.startsWith('/') && !text.startsWith('@')) {
            logger_1.Logger.log('[A.R.I.A] Image Intent Detected');
            this._handleGenerateImage(text);
            return;
        }
        // 1. Handle Action Commands (starting with / or @) - PRIORITY
        // This must come first so users can always execute commands even with context active.
        if (text.startsWith('/') || text.startsWith('@')) {
            const cmd = text.split(' ')[0].toLowerCase().replace('@', '/'); // Normalize @ to / for handling
            switch (cmd) {
                case '/help':
                    const response = "<b>Available Commands:</b><br><code>/analyze</code> - Analyze current file<br><code>/selection</code> - Analyze selected code<br><code>/workspace</code> - Analyze entire workspace<br><code>/validate</code> - Validate Hardware & Simulate<br><code>/capture</code> - Capture Image<br><code>/video</code> - Capture Video<br><code>/fault</code> - Explain Bare Metal Faults<br><code>@build</code> - Build Firmware<br><code>@flash</code> - Flash Firmware";
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
                case '/camera':
                    vscode.commands.executeCommand('aria.captureImage');
                    break;
                case '/video':
                    vscode.commands.executeCommand('aria.captureVideo');
                    break;
                // New Action Mappings
                case '/build':
                    vscode.commands.executeCommand('aria.buildFirmware');
                    break;
                case '/flash':
                    vscode.commands.executeCommand('aria.flashFirmware');
                    break;
                case '/serial':
                    vscode.commands.executeCommand('aria.openSerialMonitor');
                    break;
                case '/logs':
                    vscode.commands.executeCommand('aria.analyzeSerialLogs');
                    break;
                case '/db':
                    const debugInfo = this._chatManager.getDebugState();
                    this._panel.webview.postMessage({
                        type: 'addResult',
                        text: `<pre style="font-size:0.8em; overflow:auto;">${JSON.stringify(debugInfo, null, 2)}</pre>`
                    });
                    break;
                case '/clear':
                    this._visionReferenceActive = false;
                    this._currentVisionImage = null;
                    this._currentVideoUri = undefined;
                    this._panel.webview.postMessage({ type: 'clearContext' });
                    this._panel.webview.postMessage({ type: 'addResult', text: "<i>Context cleared. Vision/Video references removed.</i>" });
                    break;
                case '/fault':
                    this._panel.webview.postMessage({ type: 'addResult', text: "<b>Bare Metal Fault Analysis</b><br>Paste your error registers (e.g. <code>HFSR: 0x40000000</code>) or ask <i>'What is a Bus Fault?'</i> directly in the chat." });
                    break;
                case '/init':
                    // Take full argument string, not just first word
                    const boardHint = text.replace(/^\/init\s*/i, '').trim();
                    await this._handleInitProject(boardHint);
                    break;
                case '/schematic':
                case '/image':
                case '/draw':
                    const prompt = text.replace(/^\/(schematic|image|draw)\s*/i, '');
                    if (!prompt) {
                        this._panel.webview.postMessage({ type: 'addResult', text: "Please provide a description. Usage: <code>/schematic Arduino toggling LED</code>" });
                        return;
                    }
                    this._handleGenerateImage(prompt);
                    break;
                case '/explain':
                    const explainPrompt = text.replace(/^\/explain\s*/i, '');
                    if (!explainPrompt) {
                        this._panel.webview.postMessage({ type: 'addResult', text: "Please provide a query. Usage: <code>/explain how to connect L293D</code>" });
                        return;
                    }
                    this._handleExplainCommand(explainPrompt);
                    break;
                default:
                    // Only return if it matches a known command structure but not a known command
                    // Actually, if it starts with /, it's a command. If unknown, show error.
                    // If starts with @, it might be @workspace which is just context.
                    if (cmd.startsWith('/')) {
                        this._panel.webview.postMessage({ type: 'addResult', text: `Unknown command: ${cmd}` });
                        return;
                    }
                    // For @, we let it fall through to chat if it's just a context tag
                    break;
            }
            // If we matched an action (switch case executed), we stop unless we break out validation
            // The simple heuristic: if the switch handled it, we return.
            // But we can't easily check that here without a flag. 
            // Better: all known commands above 'break' the switch.
            // If we are here, and it was a known command, we should return.
            // Let's refine the switch to return directly.
            if (['/help', '/analyze', '/selection', '/workspace', '/validate', '/capture', '/camera', '/video', '/build', '/flash', '/serial', '/logs', '/clear', '/fault', '/init', '/schematic', '/image', '/draw', '/explain'].includes(cmd)) {
                return;
            }
        }
        // Vision Context Chat (if active and image exists)
        if (this._visionReferenceActive && this._currentVisionImage) {
            this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Analyzing image with Gemini 3 Pro...' });
            try {
                const result = await geminiClient_1.GeminiClient.chatWithImage(this._currentVisionImage, text);
                // Show result using standard analysis display
                this._panel.webview.postMessage({
                    type: 'showAnalysis',
                    data: result,
                    metadata: {
                        source: 'vision-chat',
                        model: 'gemini-3-pro-image-preview'
                    }
                });
            }
            catch (e) {
                this._panel.webview.postMessage({ type: 'analysisError', error: String(e) });
            }
            return;
        }
        // Video Context Chat (if active and video URI exists)
        if (this._currentVideoUri && !text.startsWith('/')) {
            this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Analyzing video with your command...' });
            try {
                const ext = path.extname(this._currentVideoPath || "").toLowerCase();
                let mime = 'video/mp4';
                if (ext === '.mov')
                    mime = 'video/quicktime';
                if (ext === '.avi')
                    mime = 'video/x-msvideo';
                if (ext === '.webm')
                    mime = 'video/webm';
                if (ext === '.mpeg' || ext === '.mpg')
                    mime = 'video/mpeg';
                const result = await geminiClient_1.GeminiClient.analyzeVideo(this._currentVideoUri, mime, text);
                this._panel.webview.postMessage({
                    type: 'showAnalysis',
                    data: result,
                    metadata: {
                        source: 'video-chat',
                        filePath: this._currentVideoPath,
                        model: 'gemini-3-pro-preview'
                    }
                });
            }
            catch (e) {
                this._panel.webview.postMessage({ type: 'analysisError', error: String(e) });
            }
            return;
        }
        let response = "";
        // (Legacy command block removed)
        // Legacy fallback for natural language requests
        // Check for natural language PIO setup intent
        // Matches "setup platformio for teensy41" or "set platformio..."
        const pioMatch = text.match(/(?:setup|set)\s+platformio.*?(?:board|for)\s+([a-zA-Z0-9_-]+)/i) ||
            (text.toLowerCase().match(/(?:setup|set)\s+platformio/) ? [text, ""] : null);
        if (pioMatch) {
            let board = pioMatch[1]?.trim() || "";
            // Filter out common false positives from loose grammar
            if (board.length < 3 || ['in', 'this', 'here', 'folder'].includes(board.toLowerCase())) {
                board = "";
            }
            await this._handleInitProject(board);
            return;
        }
        // New: Route general queries to GeminiClient.chat()
        this._panel.webview.postMessage({ type: 'analysisLoading', message: 'Processing your question...' });
        try {
            // Inject context (active file, hardware)
            let activeEditor = (0, editorContext_1.getLastActiveEditor)();
            if (!activeEditor && vscode.window.visibleTextEditors.length > 0) {
                activeEditor = vscode.window.visibleTextEditors[0];
            }
            if (activeEditor) {
                // Update last analyzed path so fallback logic works for rewrites
                this._lastAnalyzedPath = vscode.workspace.asRelativePath(activeEditor.document.uri);
            }
            const context = {
                code: activeEditor?.document.getText(),
                language: activeEditor?.document.languageId,
                filePath: activeEditor?.document.uri.fsPath,
                hardwareContext: await hardwareContext_1.HardwareContext.scan().then(hw => hw.summary)
            };
            // SPECIAL HANDLING: PlatformIO Configuration Context
            // If the user wants to change board/config, we MUST inject platformio.ini content
            // because the active file is likely main.cpp or something else.
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (root) {
                const pioPath = path.join(root, 'platformio.ini');
                if (fs.existsSync(pioPath)) {
                    try {
                        const pioContent = fs.readFileSync(pioPath, 'utf8');
                        // Append to code context or hardware context?
                        // Let's create a dedicated 'projectConfig' field in context or append to hardwareContext
                        // Appending to hardwareContext is safest for now as it gets rendered into the prompt
                        context.hardwareContext += `\n\n[Active platformio.ini Configuration]:\n${pioContent}\n(You can edit this file using a Unified Diff if requested)`;
                        context.pioConfig = pioContent; // For specialized prompt logic if needed
                    }
                    catch (e) {
                        logger_1.Logger.log(`[A.R.I.A] Failed to read platformio.ini for context: ${e}`);
                    }
                }
            }
            const result = await geminiClient_1.GeminiClient.chat(text, context);
            // Check if this is just a casual chat (no code fixes proposed)
            const isCasual = (!result.suggestions || result.suggestions.length === 0) &&
                (!result.detectedIssues || result.detectedIssues.length === 0);
            this._panel.webview.postMessage({
                type: 'showAnalysis',
                data: result,
                metadata: {
                    source: isCasual ? 'chat' : 'general-chat',
                    filePath: context.filePath ? path.basename(context.filePath) : "General Chat",
                    fullPath: context.filePath, // Preserve full path for target resolution
                    hardware: context.hardwareContext ? "Detected" : "None",
                    model: 'gemini-3-pro-preview'
                }
            });
        }
        catch (e) {
            this._panel.webview.postMessage({ type: 'analysisError', error: String(e) });
        }
    }
    async analyzeImage(base64Image) {
        try {
            vscode.window.showInformationMessage("A.R.I.A: Analyzing hardware image...");
            logger_1.Logger.log("[A.R.I.A] Starting vision analysis...");
            const result = await visionClient_1.VisionClient.analyze(base64Image);
            this._currentVisionResult = result;
            this._currentVisionImage = base64Image;
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
    _saveUserMessage(text) {
        const sessionId = this._chatManager.getCurrentSessionId();
        if (sessionId) {
            this._chatManager.addMessage(sessionId, 'user', text);
        }
    }
    _saveAssistantMessage(message) {
        const sessionId = this._chatManager.getCurrentSessionId();
        if (sessionId) {
            // We store the full message object as metadata so we can replay it exactly
            this._chatManager.addMessage(sessionId, 'assistant', '', message);
        }
    }
    _handleGetHistory() {
        const sessions = this._chatManager.getSessions();
        this._panel.webview.postMessage({ type: 'historyList', sessions });
    }
    _handleLoadSession(sessionId) {
        const session = this._chatManager.getSession(sessionId);
        if (session) {
            this._chatManager.setCurrentSession(sessionId);
            this._panel.webview.postMessage({ type: 'loadChat', session });
        }
    }
    _handleNewChat() {
        const session = this._chatManager.createSession();
        this._panel.webview.postMessage({ type: 'loadChat', session });
    }
    _handleDeleteChat(sessionId) {
        this._chatManager.deleteSession(sessionId);
        this._handleGetHistory();
    }
}
exports.AriaPanel = AriaPanel;
//# sourceMappingURL=ariaPanel.js.map