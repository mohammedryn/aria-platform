"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const vscode = require("vscode");
class Logger {
    static get channel() {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel("A.R.I.A Logs");
        }
        return this._outputChannel;
    }
    static log(message) {
        this.channel.appendLine(`[A.R.I.A] ${message}`);
    }
    static logNoPrefix(message) {
        this.channel.appendLine(message);
    }
    static logStructured(title, data) {
        this.channel.appendLine(`[A.R.I.A] ${title}`);
        for (const [key, value] of Object.entries(data)) {
            this.channel.appendLine(`  ${key}: ${value}`);
        }
    }
    static show() {
        this.channel.show(true);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map