import * as vscode from 'vscode';
import * as http from 'http';
import { Logger } from '../utils/logger';

import * as cp from 'child_process';
import * as path from 'path';

import * as fs from 'fs';

export class CameraBridge {
    private static _server: http.Server | null = null;
    private static _pythonProcess: cp.ChildProcess | null = null;
    private static _port = 0;
    private static _latestFrame: Buffer | null = null;
    private static _streamClients: http.ServerResponse[] = [];

    public static stopStream() {
        Logger.log("[CameraBridge] Stopping stream requested...");
        this._killPython();
        this._closeServer();
    }

    public static async capture(mode: 'external' | 'embedded' | 'stream' | 'native-python' = 'external', onServerReady?: (url: string) => void): Promise<string | null> {
        this._latestFrame = null;
        this._streamClients = [];
        this._killPython(); // Ensure clean state

        // Native Python Mode (Implicitly triggered if mode is 'stream' and we decide to use python internally, 
        // OR we can make a new mode 'native-python'. For now let's reuse 'stream' if a flag is passed or just add a new mode.)
        // Actually, let's overload this method to accept 'native-python' as a mode string in the type definition next time.
        // For now, if mode is 'native-python', we fork the script.
        
        if (mode === 'native-python' as any) {
             return new Promise((resolve, reject) => {
                const scriptPath = path.join(__dirname, '../../src/scripts/camera_server.py');
                Logger.log(`[CameraBridge] Launching Python Bridge: ${scriptPath}`);
                
                this._pythonProcess = cp.spawn('python', [scriptPath]);
                
                let serverUrl = '';

                this._pythonProcess.stdout?.on('data', (data) => {
                    const output = data.toString();
                    const lines = output.split(/\r?\n/);
                    
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.includes('Server started on port')) {
                            const port = trimmed.split(' ').pop();
                            serverUrl = `http://127.0.0.1:${port}`;
                            Logger.log(`[CameraBridge-Py] Bridge Ready at ${serverUrl}`);
                            if (onServerReady) onServerReady(serverUrl);
                        }
                        
                        // Check for capture result
                        if (trimmed.includes('CAPTURE_FILE:')) {
                            const filePath = trimmed.split('CAPTURE_FILE:')[1].trim();
                            Logger.log(`[CameraBridge-Py] Capture file reported: ${filePath}`);
                            
                            try {
                                const fileData = fs.readFileSync(filePath, 'utf8');
                                Logger.log(`[CameraBridge-Py] Read ${fileData.length} chars from file.`);
                                
                                // Clean up file
                                fs.unlinkSync(filePath);
                                
                                this._killPython();
                                resolve(fileData);
                            } catch (err) {
                                Logger.log(`[CameraBridge-Py] Error reading capture file: ${err}`);
                                this._killPython();
                                reject(err);
                            }
                        }
                    }
                });

                this._pythonProcess.stderr?.on('data', (data) => {
                    Logger.log(`[CameraBridge-Py Error] ${data.toString()}`);
                });

                // We need a way to trigger capture. The Python server has /trigger
                // But we are in a Promise here waiting for the result.
                // The UI will call /trigger on the python server directly?
                // YES. The UI gets the URL, displays the stream, and the UI button calls /trigger on that URL.
                // But wait, who resolves THIS promise?
                // We need to poll the python server or have the UI tell us "done"?
                // Actually, the current architecture expects this function to return the base64 string.
                // In 'stream' mode (JS), we used a local JS server that we controlled.
                // Here the Python server is external.
                // We can proxy the /trigger call?
                // Or we can just wait for the UI to signal us?
                // 
                // Let's adapt the architecture:
                // 1. Launch Python
                // 2. Return the URL to the UI (via callback)
                // 3. Wait for UI to tell us "I clicked capture, here is the result" (via a new method?)
                // OR
                // The Python server shuts down and prints the base64 to stdout?
                // Let's make the Python server print the JSON to stdout on trigger!
                
                // Update Python script logic in thought: Python script prints base64 on trigger.
                // I need to update the python script to print to stdout.
                // But the UI calls /trigger via HTTP. The Python script responds HTTP.
                // It can ALSO print to stdout.
             });
        }


        return new Promise((resolve, reject) => {
            // 1. Create Server
            this._server = http.createServer((req, res) => {
                // CORS headers
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                // Driver Page (The Camera Source)
                if (req.method === 'GET' && req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(this._getDriverHtml());
                    return;
                }

                // Stream Endpoint (The IDE View)
                if (req.method === 'GET' && req.url === '/stream') {
                    res.writeHead(200, {
                        'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    });
                    this._streamClients.push(res);
                    
                    // Remove client on close
                    req.on('close', () => {
                        this._streamClients = this._streamClients.filter(c => c !== res);
                    });
                    return;
                }

                // Update Endpoint (Driver sends frames here)
                if (req.method === 'POST' && req.url === '/update') {
                    let body = '';
                    req.on('data', chunk => body += chunk.toString());
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            if (data.base64) {
                                // Convert base64 to buffer
                                const buffer = Buffer.from(data.base64, 'base64');
                                this._latestFrame = buffer;

                                // Broadcast to stream clients
                                const header = `--frame\nContent-Type: image/jpeg\nContent-Length: ${buffer.length}\n\n`;
                                this._streamClients.forEach(client => {
                                    client.write(header);
                                    client.write(buffer);
                                    client.write('\n\n'); // End of frame
                                });

                                res.writeHead(200);
                                res.end();
                            }
                        } catch (e) { res.writeHead(500); res.end(); }
                    });
                    return;
                }

                // Trigger Capture (IDE requests finish)
                if (req.method === 'POST' && req.url === '/trigger') {
                    if (this._latestFrame) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                        
                        const finalBase64 = this._latestFrame.toString('base64');
                        this._closeServer();
                        resolve(finalBase64);
                    } else {
                        res.writeHead(400); // No frame yet
                        res.end();
                    }
                    return;
                }

                // Legacy/Direct Upload (External Browser "Capture" button)
                if (req.method === 'POST' && req.url === '/upload') {
                    let body = '';
                    req.on('data', chunk => body += chunk.toString());
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            if (data.base64) {
                                res.writeHead(200);
                                res.end(JSON.stringify({ success: true }));
                                this._closeServer();
                                resolve(data.base64);
                            }
                        } catch (e) { res.writeHead(500); res.end(); }
                    });
                    return;
                }
            });

            // 2. Start Server
            this._server.listen(0, '127.0.0.1', () => {
                const address = this._server?.address();
                if (address && typeof address !== 'string') {
                    const port = address.port;
                    const url = `http://127.0.0.1:${port}`;
                    Logger.log(`[CameraBridge] Server running at ${url}`);
                    
                    if (onServerReady) onServerReady(url);

                    // For stream mode, we MUST open external browser to act as driver
                    if (mode === 'stream') {
                         vscode.env.openExternal(vscode.Uri.parse(url));
                    } else if (mode === 'embedded') {
                        vscode.commands.executeCommand('simpleBrowser.show', url);
                    } else {
                        vscode.env.openExternal(vscode.Uri.parse(url));
                    }
                }
            });
            
            // Timeout
            setTimeout(() => { if (this._server) { this._closeServer(); resolve(null); } }, 300000); // 5 min timeout
        });
    }

    public static dispose() {
        this._killPython();
        this._closeServer();
    }

    private static _killPython() {
        if (this._pythonProcess) {
            this._pythonProcess.kill();
            this._pythonProcess = null;
        }
    }

    private static _closeServer() {
        this._killPython();
        this._streamClients = [];
        this._latestFrame = null;
        if (this._server) {
            this._server.close();
            this._server = null;
        }
    }

    private static _getDriverHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>A.R.I.A. Camera Driver</title>
    <style>
        body { background: #1e1e1e; color: #ccc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .status { margin-top: 20px; font-size: 1.2em; color: #4ec9b0; }
        .sub { font-size: 0.9em; opacity: 0.7; margin-top: 10px; max-width: 400px; text-align: center; }
    </style>
</head>
<body>
    <video id="video" autoplay playsinline style="display:none;"></video>
    <canvas id="canvas" style="display:none;"></canvas>
    
    <h2>📷 Camera Active</h2>
    <div class="status">Streaming to VS Code...</div>
    <div class="sub">You can minimize this window. The video feed is being displayed inside your IDE.</div>

    <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let active = true;

        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    requestAnimationFrame(sendFrame);
                };
            } catch (err) {
                document.body.innerHTML = "<h2 style='color:red'>Camera Access Denied</h2><p>" + err.message + "</p>";
            }
        }

        async function sendFrame() {
            if (!active) return;
            
            ctx.drawImage(video, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

            try {
                await fetch('/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64 })
                });
            } catch (e) { console.error(e); }

            setTimeout(() => requestAnimationFrame(sendFrame), 100); // ~10fps
        }

        start();
    </script>
</body>
</html>`;
    }

    // Legacy HTML getter removed for brevity, new driver handles both ideally but we keep it simple
    private static _getHtml(mode: string): string { return ""; } // Unused in new logic
}