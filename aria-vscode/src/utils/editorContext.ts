import * as vscode from 'vscode';
import { Logger } from './logger';

let lastActiveEditor: vscode.TextEditor | undefined;

export function activateEditorTracking(context: vscode.ExtensionContext) {
    // Set initial
    lastActiveEditor = vscode.window.activeTextEditor;

    // Update on change
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            lastActiveEditor = editor;
            const fileName = editor.document.fileName.split(/[\\/]/).pop();
            Logger.log(`Active file: ${fileName}`);
        }
    }, null, context.subscriptions);
}

export function getLastActiveEditor(): vscode.TextEditor | undefined {
    return lastActiveEditor || vscode.window.activeTextEditor;
}
