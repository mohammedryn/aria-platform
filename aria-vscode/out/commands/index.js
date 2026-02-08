"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode = require("vscode");
const helloAria_1 = require("./helloAria");
const analyzeSelection_1 = require("./analyzeSelection");
const analyzeFile_1 = require("./analyzeFile");
const analyzeWorkspace_1 = require("./analyzeWorkspace");
const validateHardware_1 = require("./validateHardware");
const captureImage_1 = require("./captureImage");
const captureVideo_1 = require("./captureVideo");
const setApiKey_1 = require("./setApiKey");
const buildAndFlash_1 = require("./buildAndFlash");
const openSerialMonitor_1 = require("./openSerialMonitor");
const analyzeSerialLogs_1 = require("./analyzeSerialLogs");
const analyzeTerminal_1 = require("./analyzeTerminal");
function registerCommands(context) {
    const commands = [
        { id: 'aria.openPanel', handler: () => (0, helloAria_1.openPanel)(context) },
        { id: 'aria.analyzeSelection', handler: analyzeSelection_1.analyzeSelection },
        { id: 'aria.analyzeFile', handler: analyzeFile_1.analyzeFile },
        { id: 'aria.analyzeWorkspace', handler: analyzeWorkspace_1.analyzeWorkspace },
        { id: 'aria.validateHardware', handler: validateHardware_1.validateHardware },
        { id: 'aria.captureImage', handler: captureImage_1.captureImage },
        { id: 'aria.captureVideo', handler: captureVideo_1.captureVideo },
        { id: 'aria.setApiKey', handler: setApiKey_1.setApiKey },
        { id: 'aria.buildAndFlash', handler: buildAndFlash_1.buildAndFlash },
        { id: 'aria.openSerialMonitor', handler: openSerialMonitor_1.openSerialMonitorCommand },
        { id: 'aria.analyzeSerialLogs', handler: analyzeSerialLogs_1.analyzeSerialLogsCommand },
        { id: 'aria.analyzeTerminal', handler: analyzeTerminal_1.analyzeTerminalCommand }
    ];
    for (const cmd of commands) {
        context.subscriptions.push(vscode.commands.registerCommand(cmd.id, cmd.handler));
    }
}
//# sourceMappingURL=index.js.map