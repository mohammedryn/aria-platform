"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialManager = void 0;
const vscode = require("vscode");
const cp = require("child_process");
const logger_1 = require("../utils/logger");
class SerialManager {
    static get onLogReceived() {
        return this._onLog.event;
    }
    static get channel() {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel("A.R.I.A Serial");
        }
        return this._outputChannel;
    }
    static async startSession(port, baudRate) {
        if (this._process) {
            this.stopSession();
        }
        this._logBuffer = [];
        this._currentPort = port;
        this._currentBaud = baudRate;
        logger_1.Logger.log(`[A.R.I.A] Starting serial session on ${port} @ ${baudRate}...`);
        this.channel.clear();
        this.channel.show(true);
        this.channel.appendLine(`[A.R.I.A] Connected to ${port} @ ${baudRate}`);
        // Use 'pio device monitor'
        // --port <port> --baud <baud>
        // Use --echo to ensure local echo if needed, but usually not for monitoring
        const args = ['device', 'monitor', '--port', port, '--baud', baudRate.toString()];
        this._process = cp.spawn('pio', args, { shell: true });
        this._process.stdout?.on('data', (data) => {
            const text = data.toString();
            // Handle partial lines? For simplicity, we just split by newline for now
            // But real serial data might come in chunks. 
            // However, line-based processing is better for the AI.
            const lines = text.split(/\r?\n/);
            for (const line of lines) {
                if (line.trim().length === 0)
                    continue;
                const timestamped = `[${new Date().toLocaleTimeString()}] ${line}`;
                // Add to VS Code Output
                this.channel.appendLine(timestamped);
                // Add to Memory Buffer
                this._logBuffer.push(timestamped);
                if (this._logBuffer.length > this.MAX_BUFFER_LINES) {
                    this._logBuffer.shift();
                }
            }
            this._onLog.fire(this._logBuffer.length);
        });
        this._process.stderr?.on('data', (data) => {
            const msg = `[STDERR] ${data.toString().trim()}`;
            this.channel.appendLine(msg);
            this._logBuffer.push(msg);
            if (this._logBuffer.length > this.MAX_BUFFER_LINES) {
                this._logBuffer.shift();
            }
            this._onLog.fire(this._logBuffer.length);
        });
        this._process.on('close', (code) => {
            this.channel.appendLine(`[A.R.I.A] Serial session disconnected (Code ${code})`);
            logger_1.Logger.log(`[A.R.I.A] Serial session ended (Code ${code})`);
            this._process = null;
            this._currentPort = null;
            this._currentBaud = null;
            this._onLog.fire(this._logBuffer.length); // Update UI
        });
        return true;
    }
    static stopSession() {
        if (this._process) {
            // On Windows, killing a shell-spawned process might not kill the tree. 
            // But let's try standard kill first.
            try {
                // If using 'pio' command which spawns a python process, we might need tree-kill
                // But for MVP let's assume simple kill works or user can retry.
                this._process.kill();
            }
            catch (e) {
                logger_1.Logger.log(`[SerialManager] Error killing process: ${e}`);
            }
            this._process = null;
            this.channel.appendLine(`[A.R.I.A] Session stopped by user.`);
            this._currentPort = null;
            this._currentBaud = null;
            this._onLog.fire(this._logBuffer.length);
        }
    }
    static getLogs() {
        return [...this._logBuffer];
    }
    static isActive() {
        return this._process !== null;
    }
    static getSessionInfo() {
        return {
            connected: this.isActive(),
            port: this._currentPort,
            baud: this._currentBaud,
            lineCount: this._logBuffer.length
        };
    }
}
exports.SerialManager = SerialManager;
SerialManager._process = null;
SerialManager._logBuffer = [];
SerialManager.MAX_BUFFER_LINES = 500;
SerialManager._onLog = new vscode.EventEmitter(); // Emits current line count
SerialManager._currentPort = null;
SerialManager._currentBaud = null;
//# sourceMappingURL=serialManager.js.map