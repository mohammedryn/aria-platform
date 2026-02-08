import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export async function setApiKey() {
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
            Logger.log('API Key updated via command.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save API Key: ${error}`);
            Logger.log(`Error saving API key: ${error}`);
        }
    }
}
