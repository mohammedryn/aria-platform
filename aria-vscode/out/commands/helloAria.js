"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openPanel = openPanel;
const ariaPanel_1 = require("../panels/ariaPanel");
const logger_1 = require("../utils/logger");
function openPanel(context) {
    logger_1.Logger.log("Executing command: Open Copilot Panel");
    ariaPanel_1.AriaPanel.createOrShow(context);
}
//# sourceMappingURL=helloAria.js.map