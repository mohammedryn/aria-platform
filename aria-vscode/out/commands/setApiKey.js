"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setApiKey = setApiKey;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
async function setApiKey() {
    const key = await vscode.window.showInputBox({
        title: 'Set Gemini API Key',
        prompt: 'Enter your Gemini API Key (or the Test Key provided in the submission)',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'AIzaSy...'
    });
    if (key) {
        try {
            await vscode.workspace.getConfiguration('aria').update('apiKey', key, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('A.R.I.A: API Key saved successfully.');
            logger_1.Logger.log('API Key updated via command.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to save API Key: ${error}`);
            logger_1.Logger.log(`Error saving API key: ${error}`);
        }
    }
}
//# sourceMappingURL=setApiKey.js.map