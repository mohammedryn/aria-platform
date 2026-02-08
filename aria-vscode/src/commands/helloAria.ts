import * as vscode from 'vscode';
import { AriaPanel } from '../panels/ariaPanel';
import { Logger } from '../utils/logger';

export function openPanel(context: vscode.ExtensionContext) {
    Logger.log("Executing command: Open Copilot Panel");
    AriaPanel.createOrShow(context);
}
