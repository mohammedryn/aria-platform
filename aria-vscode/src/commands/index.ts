import * as vscode from 'vscode';
import { openPanel } from './helloAria';
import { analyzeSelection } from './analyzeSelection';
import { analyzeFile } from './analyzeFile';
import { analyzeWorkspace } from './analyzeWorkspace';
import { validateHardware } from './validateHardware';
import { captureImage } from './captureImage';

export function registerCommands(context: vscode.ExtensionContext) {
    const commands = [
        { id: 'aria.openPanel', handler: () => openPanel(context) },
        { id: 'aria.analyzeSelection', handler: analyzeSelection },
        { id: 'aria.analyzeFile', handler: analyzeFile },
        { id: 'aria.analyzeWorkspace', handler: analyzeWorkspace },
        { id: 'aria.validateHardware', handler: validateHardware },
        { id: 'aria.captureImage', handler: captureImage }
    ];

    for (const cmd of commands) {
        context.subscriptions.push(
            vscode.commands.registerCommand(cmd.id, cmd.handler)
        );
    }
}
