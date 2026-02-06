"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateEditorTracking = activateEditorTracking;
exports.getLastActiveEditor = getLastActiveEditor;
const vscode = require("vscode");
const logger_1 = require("./logger");
let lastActiveEditor;
function activateEditorTracking(context) {
    // Set initial
    lastActiveEditor = vscode.window.activeTextEditor;
    // Update on change
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            lastActiveEditor = editor;
            const fileName = editor.document.fileName.split(/[\\/]/).pop();
            logger_1.Logger.log(`Active file: ${fileName}`);
        }
    }, null, context.subscriptions);
}
function getLastActiveEditor() {
    return lastActiveEditor || vscode.window.activeTextEditor;
}
//# sourceMappingURL=editorContext.js.map