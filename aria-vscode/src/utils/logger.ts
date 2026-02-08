import * as vscode from 'vscode';

export class Logger {
    private static _outputChannel: vscode.OutputChannel;

    private static get channel(): vscode.OutputChannel {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel("A.R.I.A Logs");
        }
        return this._outputChannel;
    }

    public static log(message: string) {
        this.channel.appendLine(`[A.R.I.A] ${message}`);
    }

    public static logNoPrefix(message: string) {
        this.channel.appendLine(message);
    }

    public static logStructured(title: string, data: Record<string, any>) {
        this.channel.appendLine(`[A.R.I.A] ${title}`);
        for (const [key, value] of Object.entries(data)) {
            this.channel.appendLine(`  ${key}: ${value}`);
        }
    }

    public static show() {
        this.channel.show(true);
    }
}
