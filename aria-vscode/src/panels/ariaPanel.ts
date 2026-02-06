import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../utils/logger';
import { DiffEngine } from '../utils/diffEngine';
import { getLastActiveEditor } from '../utils/editorContext';
import { WokwiGenerator } from '../simulation/wokwiGenerator';
import { VisionClient, VisionResult } from '../vision/visionClient';
import { HardwareContext } from '../context/hardwareContext';

export class AriaPanel {
    public static currentPanel: AriaPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _currentVisionResult: VisionResult | null = null;

    public get visionResult(): VisionResult | null {
        return this._currentVisionResult;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Receive messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
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
                                fetch(message.url + '/trigger', { method: 'POST' }).catch(e => 
                                    Logger.log(`[AriaPanel] Trigger catch: ${e}`)
                                );
                            } catch (err) {
                                Logger.log(`[AriaPanel] Trigger failed: ${err}`);
                            }
                        }
                        return;
                    case 'discardVision':
                        this._currentVisionResult = null;
                        Logger.log("[A.R.I.A] Vision context discarded by user.");
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside; 

        // If we already have a panel, show it.
        if (AriaPanel.currentPanel) {
            AriaPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'ariaPanel',
            'A.R.I.A. Copilot',
            column,
            {
                // Enable javascript in the webview
                enableScripts: true,
                // Keep the state (chat history) alive when the tab is hidden
                retainContextWhenHidden: true,
                // And restrict the webview to only loading content from our extension's `media` directory.
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        AriaPanel.currentPanel = new AriaPanel(panel, extensionUri);
    }

    public static postMessage(message: any) {
        if (AriaPanel.currentPanel) {
            AriaPanel.currentPanel._panel.webview.postMessage(message);
        }
    }

    public dispose() {
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

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'aria-panel.html');
        let htmlContent = "";
        try {
            htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
        } catch (e) {
            Logger.log(`Error loading HTML: ${e}`);
            htmlContent = `<h1>Error loading panel</h1>`;
        }
        
        return htmlContent;
    }

    private async _handlePreviewDiff(diff: string) {
        const editor = getLastActiveEditor();
        if (!editor) {
            vscode.window.showErrorMessage("A.R.I.A: No active editor to apply preview.");
            return;
        }

        const originalText = editor.document.getText();
        const patchedText = DiffEngine.applyPatch(originalText, diff);

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
        } catch (e) {
            Logger.log(`[AriaPanel] Preview error: ${e}`);
        }
    }

    private async _handleApplyDiff(diff: string, description: string) {
        const editor = getLastActiveEditor();
        if (!editor) {
            vscode.window.showErrorMessage("A.R.I.A: No active editor to apply changes.");
            return;
        }

        const originalText = editor.document.getText();
        const patchedText = DiffEngine.applyPatch(originalText, diff);

        if (patchedText === null) {
            vscode.window.showErrorMessage("A.R.I.A: Failed to apply patch. The file may have changed.");
            return;
        }

        // Apply via WorkspaceEdit (Replacing full text is safer given our simple patcher)
        // A full patcher would yield TextEdits, but since we already rebuilt the string,
        // we can just replace the whole range.
        
        const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(originalText.length)
        );

        const edit = new vscode.WorkspaceEdit();
        edit.replace(editor.document.uri, fullRange, patchedText);

        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            await editor.document.save();
            Logger.log(`[A.R.I.A] Applied suggestion: ${description}`);
            vscode.window.showInformationMessage(`A.R.I.A: Applied fix - ${description}`);
        } else {
            vscode.window.showErrorMessage("A.R.I.A: Failed to apply edits.");
        }
    }

    private _handleGenerateSimulation(validationResult: any, metadata: any) {
        try {
            const json = WokwiGenerator.generate(metadata.workspaceRoot, metadata.board, validationResult);
            // Pass metadata.board as the 3rd argument (boardId)
            WokwiGenerator.createProjectFiles(metadata.workspaceRoot, json, metadata.board);
            
            vscode.window.showInformationMessage("A.R.I.A: Simulation files generated in .wokwi/ and wokwi.toml");
            this._panel.webview.postMessage({ type: 'simulationReady', workspaceRoot: metadata.workspaceRoot });
        } catch (e) {
            Logger.log(`[A.R.I.A] Simulation generation failed: ${e}`);
            vscode.window.showErrorMessage(`A.R.I.A: Failed to generate simulation: ${e}`);
        }
    }

    private async _handleOpenSimulation(workspaceRoot: string) {
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
            } else {
                // Wait a moment for the editor to settle and extension to activate
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Directly start the simulation
                try {
                    await vscode.commands.executeCommand('wokwi.start');
                } catch (err) {
                    Logger.log(`[A.R.I.A] Failed to trigger wokwi.start: ${err}`);
                    vscode.window.showWarningMessage(`A.R.I.A: Opened diagram, but could not auto-start simulation. Click 'Start Simulation' in the editor.`);
                }
            }

        } catch (e) {
            vscode.window.showErrorMessage(`A.R.I.A: Error opening simulation: ${e}`);
        }
    }

    private _handleCommand(text: string) {
        Logger.log(`User command: ${text}`);
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
        } else {
            response = `A.R.I.A. is a command-based system. Type <code>/help</code> for options.`;
            this._panel.webview.postMessage({ type: 'addResult', text: response });
        }
    }

    public async analyzeImage(base64Image: string) {
        try {
            vscode.window.showInformationMessage("A.R.I.A: Analyzing hardware image...");
            Logger.log("[A.R.I.A] Starting vision analysis...");

            const result = await VisionClient.analyze(base64Image);
            this._currentVisionResult = result;

            // Context Comparison
            const editor = getLastActiveEditor();
            let mismatchWarning: string | undefined;

            if (editor) {
                const workspaceRoot = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
                if (workspaceRoot) {
                    const pioContext = await HardwareContext.getPlatformIOContext(workspaceRoot);
                    if (pioContext && pioContext.board) {
                        const pioBoard = pioContext.board.toLowerCase().replace(/_/g, ' ');
                        const visionBoards = result.detectedBoards.map(b => b.toLowerCase());
                        
                        // Simple fuzzy check: Does any vision board string contain parts of pio board or vice versa?
                        // e.g. "teensy41" vs "teensy 4.1"
                        const match = visionBoards.some(vb => 
                            vb.includes(pioBoard) || pioBoard.includes(vb) || 
                            (vb.includes('arduino') && pioBoard.includes('uno')) // common alias
                        );

                        if (visionBoards.length > 0 && !match) {
                            mismatchWarning = `Vision sees "${result.detectedBoards.join(', ')}" but PlatformIO configures "${pioContext.board}".`;
                            Logger.log(`[A.R.I.A] Vision Mismatch: ${mismatchWarning}`);
                        }
                    }
                }
            }

            Logger.log(`[A.R.I.A] Vision confidence: ${result.confidence}`);
            Logger.log(`[A.R.I.A] Vision used as advisory context only`);

            this._panel.webview.postMessage({ 
                type: 'visionResult', 
                data: { ...result, mismatchWarning } 
            });

        } catch (e) {
            Logger.log(`[A.R.I.A] Vision handling error: ${e}`);
            vscode.window.showErrorMessage(`A.R.I.A: Vision analysis failed: ${e}`);
        }
    }
}
