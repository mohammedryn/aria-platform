"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode = require("vscode");
const helloAria_1 = require("./helloAria");
const analyzeSelection_1 = require("./analyzeSelection");
const analyzeFile_1 = require("./analyzeFile");
const analyzeWorkspace_1 = require("./analyzeWorkspace");
const validateHardware_1 = require("./validateHardware");
function registerCommands(context) {
    const commands = [
        { id: 'aria.openPanel', handler: () => (0, helloAria_1.openPanel)(context) },
        { id: 'aria.analyzeSelection', handler: analyzeSelection_1.analyzeSelection },
        { id: 'aria.analyzeFile', handler: analyzeFile_1.analyzeFile },
        { id: 'aria.analyzeWorkspace', handler: analyzeWorkspace_1.analyzeWorkspace },
        { id: 'aria.validateHardware', handler: validateHardware_1.validateHardware }
    ];
    for (const cmd of commands) {
        context.subscriptions.push(vscode.commands.registerCommand(cmd.id, cmd.handler));
    }
}
//# sourceMappingURL=index.js.map