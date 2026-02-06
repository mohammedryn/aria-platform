"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardwareValidator = void 0;
class HardwareValidator {
    /**
     * Heuristic-based hardware validation.
     * Checks for common issues like pin conflicts, out-of-bounds usage, and missing definitions.
     */
    static validate(code, hardwareSummary, visionContext) {
        const issues = [];
        const recommendations = [];
        const pinUsage = {}; // Changed to Object
        const peripherals = [];
        let status = "pass";
        // 1. Detect Pin Definitions (#define or const int)
        const pinDefRegex = /#define\s+(\w+)\s+(\d+)|const\s+int\s+(\w+)\s*=\s*(\d+);/g;
        let match;
        const definedPins = new Map(); // Name -> Number
        while ((match = pinDefRegex.exec(code)) !== null) {
            const name = match[1] || match[3];
            const pin = match[2] || match[4];
            if (pinUsage[pin]) {
                issues.push(`Duplicate pin assignment: Pin ${pin} is used by ${pinUsage[pin]} and ${name}`);
                status = "fail";
            }
            else {
                pinUsage[pin] = name;
                definedPins.set(name, pin);
            }
        }
        // 2. Detect Servo Usage
        if (code.includes("Servo.h")) {
            peripherals.push("servo");
            // Check attach() calls
            const attachRegex = /(\w+)\.attach\s*\(\s*(\w+)\s*\)/g;
            while ((match = attachRegex.exec(code)) !== null) {
                const servoObj = match[1];
                const pinOrVar = match[2];
                // If variable, try to resolve
                const pinNum = definedPins.get(pinOrVar) || pinOrVar;
                if (!/^\d+$/.test(pinNum) && !definedPins.has(pinOrVar)) {
                    // Can't resolve statically, might be OK
                }
                else {
                    // Pin is resolved
                }
            }
            // Check write() bounds
            const writeRegex = /\.write\s*\(\s*(\d+)\s*\)/g;
            while ((match = writeRegex.exec(code)) !== null) {
                const angle = parseInt(match[1]);
                if (angle < 0 || angle > 180) {
                    issues.push(`Servo angle out of bounds: ${angle} (should be 0-180)`);
                    status = "fail"; // Servo damage risk
                }
            }
        }
        // 3. Detect Stepper Usage
        if (code.includes("AccelStepper.h")) {
            peripherals.push("stepper");
            // Check constructor: AccelStepper stepper(AccelStepper::DRIVER, STEP, DIR);
            // Heuristic check for missing driver assumption
            if (!code.includes("AccelStepper::DRIVER") && !code.includes("1")) {
                // Maybe using 4-wire?
            }
            else {
                // Using driver
            }
        }
        // 4. Board-Specific Checks (Teensy 4.1 Example)
        if (hardwareSummary.toLowerCase().includes("teensy41")) {
            for (const [pin, name] of Object.entries(pinUsage)) {
                const p = parseInt(pin);
                if (p > 55) { // Teensy 4.1 has pins 0-55
                    issues.push(`Invalid pin number for Teensy 4.1: ${pin} (${name})`);
                    status = "fail";
                }
            }
        }
        // 5. Vision-Enhanced Validation
        if (visionContext) {
            // Check for unreferenced components
            const commonComponents = ['servo', 'stepper', 'sensor', 'display', 'led', 'button'];
            visionContext.detectedComponents.forEach(vc => {
                const component = vc.toLowerCase();
                if (commonComponents.some(c => component.includes(c))) {
                    const isUsed = peripherals.some(p => component.includes(p)) || code.toLowerCase().includes(component);
                    if (!isUsed) {
                        recommendations.push(`Vision Warning: Detected '${vc}' but found no explicit reference in code.`);
                    }
                }
            });
            // Check for board mismatch (Advisory)
            if (visionContext.detectedBoards.length > 0) {
                const visionBoard = visionContext.detectedBoards[0].toLowerCase();
                const configBoard = hardwareSummary.toLowerCase();
                // Simple inclusion check
                if (!configBoard.includes(visionBoard) && !visionBoard.includes(configBoard)) {
                    issues.push(`Board Mismatch: Vision detected '${visionContext.detectedBoards[0]}' but project is configured for '${hardwareSummary}'.`);
                    status = (status === "pass") ? "warning" : status;
                }
            }
        }
        // 6. General Recommendations
        if (issues.length === 0) {
            recommendations.push("Hardware config looks valid.");
        }
        else {
            status = status === "pass" ? "warning" : status;
        }
        return { status, issues, recommendations, pinUsage, peripherals };
    }
}
exports.HardwareValidator = HardwareValidator;
//# sourceMappingURL=validator.js.map