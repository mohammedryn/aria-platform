import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AriaPanel } from './ariaPanel';
import { CameraBridge } from '../vision/cameraBridge';

export class CameraPanel {
    public static currentPanel: CameraPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'imageCaptured':
                        Logger.log("[CameraPanel] Image captured.");
                        
                        // Ensure panel is open
                        if (!AriaPanel.currentPanel) {
                            vscode.window.showWarningMessage("A.R.I.A Panel not open. Opening...");
                            await vscode.commands.executeCommand('aria.openPanel');
                            // Small delay to ensure it's ready
                            await new Promise(r => setTimeout(r, 500));
                        }

                        if (AriaPanel.currentPanel) {
                            await AriaPanel.currentPanel.analyzeImage(message.base64);
                        } else {
                            Logger.log("[CameraPanel] Failed to open AriaPanel for analysis.");
                        }
                        
                        this.dispose();
                        return;
                    case 'cameraError':
                        Logger.log(`[CameraPanel] Camera access denied: ${message.text}. Switching to Bridge.`);
                        // Launch Bridge and tell Webview to show Iframe
                        this._handleCameraFallback();
                        return;
                    case 'triggerCapture':
                        // User clicked "Capture" in the IDE panel (Stream Mode)
                        if (message.url) {
                            try {
                                // We need to use node-fetch or built-in fetch if available (Node 18+)
                                // VS Code extension host has global fetch in recent versions
                                await fetch(message.url + '/trigger', { method: 'POST' });
                            } catch (err) {
                                Logger.log("[CameraPanel] Trigger failed: " + err);
                            }
                        }
                        return;
                    case 'log':
                        Logger.log(`[CameraPanel] ${message.text}`);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleCameraFallback() {
        try {
            // Use CameraBridge in STREAM mode
            // This will open external browser (to get camera) but stream video HERE
            const base64 = await CameraBridge.capture('stream', (url: string) => {
                Logger.log(`[CameraPanel] Streaming Bridge ready at ${url}. Embedding stream in panel.`);
                this._panel.webview.postMessage({ command: 'showStream', url: url });
            });

            if (base64) {
                 if (AriaPanel.currentPanel) {
                    await AriaPanel.currentPanel.analyzeImage(base64);
                }
                this.dispose();
            }
        } catch (err) {
            Logger.log(`[CameraPanel] Bridge fallback failed: ${err}`);
        }
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside;

        if (CameraPanel.currentPanel) {
            CameraPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'ariaCamera',
            'A.R.I.A. Camera',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: []
            }
        );

        CameraPanel.currentPanel = new CameraPanel(panel, extensionUri);
    }

    public dispose() {
        CameraPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:*; img-src vscode-resource: https: data: http://127.0.0.1:*; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src vscode-resource: https: data: blob: mediastream: http://127.0.0.1:*;">
    <title>Hardware Capture</title>
    <style>
        body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        video {
            width: 100%;
            max-width: 640px;
            background: #000;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-panel-border);
            min-height: 200px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 2px;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .error {
            color: var(--vscode-errorForeground);
            margin-bottom: 20px;
            text-align: center;
            max-width: 600px;
        }
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <h2>Capture Hardware</h2>
    <div id="error-msg" class="error" style="display: none;"></div>
    
    <div id="camera-container" style="display: flex; flex-direction: column; align-items: center; width: 100%;">
        <div id="video-placeholder" style="width: 100%; max-width: 640px; height: 300px; background: #000; display: flex; align-items: center; justify-content: center; color: #666; margin-bottom: 20px;">
            Camera Inactive
        </div>
        <video id="video" autoplay playsinline class="hidden"></video>
        
        <div style="display: flex; gap: 10px;">
            <button id="start-btn">Start Camera</button>
            <button id="capture-btn" class="hidden">Capture Photo</button>
        </div>
    </div>

    <div id="fallback-container" class="hidden" style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
        <p>If camera access fails, you can upload an image file.</p>
        <input type="file" id="file-input" accept="image/*" style="display: none">
        <button id="upload-btn" class="secondary">Select Image File</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const video = document.getElementById('video');
        const videoPlaceholder = document.getElementById('video-placeholder');
        const startBtn = document.getElementById('start-btn');
        const captureBtn = document.getElementById('capture-btn');
        const errorMsg = document.getElementById('error-msg');
        const cameraContainer = document.getElementById('camera-container');
        const fallbackContainer = document.getElementById('fallback-container');
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');

        async function startCamera() {
            try {
                errorMsg.style.display = 'none';
                startBtn.disabled = true;
                startBtn.innerText = "Requesting Access...";
                
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                
                video.classList.remove('hidden');
                videoPlaceholder.classList.add('hidden');
                startBtn.classList.add('hidden');
                captureBtn.classList.remove('hidden');
                
                // Show fallback just in case
                fallbackContainer.classList.remove('hidden');
            } catch (err) {
                showError("Camera Access Denied: " + err.message + ".\\nSwitching to Stream Mode...");
                vscode.postMessage({ command: 'log', text: 'Camera error: ' + err.message });
                vscode.postMessage({ command: 'cameraError', text: err.message });
                startBtn.disabled = false;
                startBtn.innerText = "Retry Camera";
                showFallback();
            }
        }

        function showError(msg) {
            errorMsg.innerText = msg;
            errorMsg.style.display = 'block';
        }

        function showFallback() {
            fallbackContainer.classList.remove('hidden');
        }

        startBtn.addEventListener('click', startCamera);

        captureBtn.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const base64Url = canvas.toDataURL('image/jpeg');
            const base64 = base64Url.split(',')[1];

            vscode.postMessage({
                command: 'imageCaptured',
                base64: base64
            });
            
            // Stop stream
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(t => t.stop());
            }
        });

        // Fallback File Upload Logic
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Url = event.target.result;
                const base64 = base64Url.split(',')[1];
                vscode.postMessage({
                    command: 'imageCaptured',
                    base64: base64
                });
            };
            reader.readAsDataURL(file);
        });

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'showIframe':
                    // Hide video, show iframe
                    video.classList.add('hidden');
                    videoPlaceholder.classList.add('hidden');
                    startBtn.classList.add('hidden');
                    errorMsg.style.display = 'none';
                    
                    const iframe = document.createElement('iframe');
                    iframe.src = message.url;
                    iframe.allow = "camera; microphone";
                    iframe.style.width = "100%";
                    iframe.style.height = "400px";
                    iframe.style.border = "none";
                    iframe.style.background = "#000";
                    
                    cameraContainer.appendChild(iframe);
                    break;
                case 'showStream':
                    // Hide video, show MJPEG Stream
                    video.classList.add('hidden');
                    videoPlaceholder.classList.add('hidden');
                    startBtn.classList.add('hidden');
                    errorMsg.style.display = 'none';
                    
                    const streamContainer = document.createElement('div');
                    streamContainer.style.display = 'flex';
                    streamContainer.style.flexDirection = 'column';
                    streamContainer.style.alignItems = 'center';
                    
                    const img = document.createElement('img');
                    img.src = message.url + '/stream';
                    img.style.width = '100%';
                    img.style.maxWidth = '640px';
                    img.style.border = '1px solid #3c3c3c';
                    img.style.background = '#000';
                    
                    const capBtn = document.createElement('button');
                    capBtn.innerText = "Capture Photo";
                    capBtn.style.marginTop = '10px';
                    capBtn.onclick = () => {
                        vscode.postMessage({ command: 'triggerCapture', url: message.url });
                        capBtn.disabled = true;
                        capBtn.innerText = "Processing...";
                    };
                    
                    const hint = document.createElement('p');
                    hint.innerText = "Native Camera Stream (Python)";
                    hint.style.fontSize = "0.8em";
                    hint.style.opacity = "0.6";

                    streamContainer.appendChild(img);
                    streamContainer.appendChild(capBtn);
                    streamContainer.appendChild(hint);
                    
                    cameraContainer.appendChild(streamContainer);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
