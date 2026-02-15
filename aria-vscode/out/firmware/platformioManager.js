"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformIOManager = void 0;
const vscode = require("vscode");
const cp = require("child_process");
const path = require("path");
const fs = require("fs");
const logger_1 = require("../utils/logger");
class PlatformIOManager {
    static get isBusy() { return this._isBusy; }
    /**
     * Resolves a natural language board name to a PlatformIO board ID.
     * First checks the local alias map, then falls back to Gemini AI.
     * @param boardHint User's board name (e.g., "arduino nano", "esp32")
     * @returns Resolved PlatformIO board ID or null if unresolvable
     */
    static async resolveBoardId(boardHint) {
        if (!boardHint || boardHint.trim().length === 0) {
            return null;
        }
        const normalized = boardHint.toLowerCase().trim();
        // 1. Check if it's already a valid-looking PlatformIO board ID (no spaces, looks like an ID)
        if (/^[a-z0-9_-]+$/i.test(normalized) && !normalized.includes(" ")) {
            // Could be a direct board ID like "nanoatmega328" - check alias first anyway
            if (this.BOARD_ALIASES[normalized]) {
                return this.BOARD_ALIASES[normalized];
            }
            // Assume it's a valid board ID and let PlatformIO validate
            return normalized;
        }
        // 2. Check the alias map
        if (this.BOARD_ALIASES[normalized]) {
            logger_1.Logger.log(`[PlatformIO] Resolved "${boardHint}" → "${this.BOARD_ALIASES[normalized]}" (alias map)`);
            return this.BOARD_ALIASES[normalized];
        }
        // 3. Try fuzzy matching (partial match)
        for (const [alias, boardId] of Object.entries(this.BOARD_ALIASES)) {
            if (normalized.includes(alias) || alias.includes(normalized)) {
                logger_1.Logger.log(`[PlatformIO] Resolved "${boardHint}" → "${boardId}" (fuzzy match on "${alias}")`);
                return boardId;
            }
        }
        // 4. Fall back to Gemini AI for unknown boards
        logger_1.Logger.log(`[PlatformIO] Board "${boardHint}" not in alias map, asking Gemini...`);
        try {
            const { GeminiClient } = await Promise.resolve().then(() => require('../ai/geminiClient'));
            const result = await GeminiClient.chat(`What is the PlatformIO board ID for "${boardHint}"? Reply with ONLY the board ID, nothing else. Example: nanoatmega328`, { hardwareContext: "User is setting up a PlatformIO project." });
            const aiResponse = result.summary?.trim() || "";
            // Validate: should be a single word, no spaces, alphanumeric with underscores/dashes
            if (/^[a-zA-Z0-9_-]+$/.test(aiResponse) && aiResponse.length > 2 && aiResponse.length < 50) {
                logger_1.Logger.log(`[PlatformIO] Gemini resolved "${boardHint}" → "${aiResponse}"`);
                return aiResponse;
            }
            else {
                logger_1.Logger.log(`[PlatformIO] Gemini response invalid: "${aiResponse}"`);
            }
        }
        catch (e) {
            logger_1.Logger.log(`[PlatformIO] Gemini fallback failed: ${e}`);
        }
        return null;
    }
    /**
     * Detects if a PlatformIO project exists in the current workspace.
     */
    static async isProjectDetected() {
        const files = await vscode.workspace.findFiles('**/platformio.ini');
        return files.length > 0;
    }
    /**
     * Initializes a new PlatformIO project.
     * @param board The board ID (e.g., 'uno', 'teensy41')
     */
    static async initProject(board, workspaceRoot) {
        return new Promise((resolve) => {
            logger_1.Logger.log(`[PlatformIO] Initializing project for board: ${board}...`);
            // Use --project-option to set framework to arduino by default if not specified? 
            // Usually init --board implies a default framework, but explicit is better.
            // Let's stick to standard init for now.
            const cmd = `pio project init --board ${board} --project-option "framework=arduino"`;
            cp.exec(cmd, { cwd: workspaceRoot }, async (err, stdout, stderr) => {
                if (err) {
                    logger_1.Logger.log(`[PlatformIO] Init failed: ${stderr}`);
                    vscode.window.showErrorMessage(`PlatformIO Init Failed: ${stderr}`);
                    resolve(false);
                }
                else {
                    logger_1.Logger.log(`[PlatformIO] Project initialized successfully.`);
                    // Ensure src/main.cpp exists but leave it empty (User Request)
                    const srcDir = path.join(workspaceRoot, 'src');
                    const mainCpp = path.join(srcDir, 'main.cpp');
                    if (!fs.existsSync(srcDir)) {
                        try {
                            fs.mkdirSync(srcDir, { recursive: true });
                        }
                        catch (e) {
                            logger_1.Logger.log(`[PlatformIO] Failed to create src directory: ${e}`);
                        }
                    }
                    if (!fs.existsSync(mainCpp)) {
                        logger_1.Logger.log(`[PlatformIO] Creating empty main.cpp...`);
                        const emptyCode = `/**
 * PlatformIO Project Initialized by A.R.I.A
 * Board: ${board}
 */
#include <Arduino.h>

void setup() {
  // Put your setup code here, to run once:
}

void loop() {
  // Put your main code here, to run repeatedly:
}
`;
                        try {
                            fs.writeFileSync(mainCpp, emptyCode);
                        }
                        catch (e) {
                            logger_1.Logger.log(`[PlatformIO] Failed to create main.cpp: ${e}`);
                        }
                    }
                    // Open platformio.ini to show success
                    const pioIni = path.join(workspaceRoot, 'platformio.ini');
                    if (fs.existsSync(pioIni)) {
                        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(pioIni));
                        await vscode.window.showTextDocument(doc);
                    }
                    resolve(true);
                }
            });
        });
    }
    /**
     * Builds the firmware using `pio run`.
     * Returns success status and the full build output.
     */
    static async buildFirmware(workspaceRoot) {
        if (this._isBusy) {
            logger_1.Logger.log("[PlatformIO] Cannot build: PlatformIO is busy.");
            return { success: false, output: "PlatformIO is busy." };
        }
        this._isBusy = true;
        return new Promise((resolve) => {
            logger_1.Logger.log(`[A.R.I.A] Build started...`);
            logger_1.Logger.show(); // Show output channel
            let outputBuffer = "";
            const buildProcess = cp.spawn('pio', ['run'], { cwd: workspaceRoot, shell: true });
            buildProcess.stdout.on('data', (data) => {
                const str = data.toString();
                outputBuffer += str;
                logger_1.Logger.logNoPrefix(str);
            });
            buildProcess.stderr.on('data', (data) => {
                const str = data.toString();
                outputBuffer += str;
                logger_1.Logger.logNoPrefix(str);
            });
            buildProcess.on('close', (code) => {
                this._isBusy = false;
                if (code === 0) {
                    logger_1.Logger.log(`[A.R.I.A] Build success`);
                    resolve({ success: true, output: outputBuffer });
                }
                else {
                    logger_1.Logger.log(`[A.R.I.A] Build failed with code ${code}`);
                    resolve({ success: false, output: outputBuffer });
                }
            });
        });
    }
    /**
     * Flashes the firmware using `pio run --target upload`.
     * @param port Optional port to specify.
     */
    static async flashFirmware(workspaceRoot, port) {
        if (this._isBusy) {
            logger_1.Logger.log("[PlatformIO] Cannot flash: PlatformIO is busy.");
            return false;
        }
        this._isBusy = true;
        return new Promise((resolve) => {
            logger_1.Logger.log(`[A.R.I.A] Flash process started...`);
            logger_1.Logger.show();
            const args = ['run', '--target', 'upload'];
            if (port) {
                args.push('--upload-port', port);
            }
            const flashProcess = cp.spawn('pio', args, { cwd: workspaceRoot, shell: true });
            flashProcess.stdout.on('data', (data) => {
                logger_1.Logger.logNoPrefix(data.toString());
            });
            flashProcess.stderr.on('data', (data) => {
                logger_1.Logger.logNoPrefix(data.toString());
            });
            flashProcess.on('close', (code) => {
                this._isBusy = false;
                if (code === 0) {
                    logger_1.Logger.log(`[A.R.I.A] Upload complete`);
                    resolve(true);
                }
                else {
                    logger_1.Logger.log(`[A.R.I.A] Flash aborted/failed with code ${code}`);
                    resolve(false);
                }
            });
        });
    }
    /**
     * Lists detected serial ports.
     */
    static async listPorts() {
        return new Promise((resolve) => {
            cp.exec('pio device list --json-output', (err, stdout, stderr) => {
                if (err) {
                    logger_1.Logger.log(`[PlatformIO] Failed to list devices: ${stderr}`);
                    resolve([]);
                    return;
                }
                try {
                    const devices = JSON.parse(stdout.toString());
                    // Filter for likely upload ports if needed, but returning all is safer
                    const ports = devices.map((d) => d.port);
                    resolve(ports);
                }
                catch (e) {
                    logger_1.Logger.log(`[PlatformIO] Error parsing device list: ${e}`);
                    resolve([]);
                }
            });
        });
    }
}
exports.PlatformIOManager = PlatformIOManager;
PlatformIOManager._isBusy = false;
/**
 * Map of common board names/aliases to PlatformIO board IDs.
 * Keys are lowercase for case-insensitive matching.
 */
PlatformIOManager.BOARD_ALIASES = {
    // Arduino family
    "arduino nano": "nanoatmega328",
    "nano": "nanoatmega328",
    "arduino nano every": "nano_every",
    "nano every": "nano_every",
    "arduino uno": "uno",
    "uno": "uno",
    "arduino mega": "megaatmega2560",
    "mega": "megaatmega2560",
    "arduino mega 2560": "megaatmega2560",
    "arduino leonardo": "leonardo",
    "leonardo": "leonardo",
    "arduino micro": "micro",
    "micro": "micro",
    "arduino due": "due",
    "due": "due",
    "arduino pro mini": "pro16MHzatmega328",
    "pro mini": "pro16MHzatmega328",
    // ESP family
    "esp32": "esp32dev",
    "esp32 dev": "esp32dev",
    "esp32 devkit": "esp32dev",
    "esp32-s3": "esp32-s3-devkitc-1",
    "esp32 s3": "esp32-s3-devkitc-1",
    "esp32-c3": "esp32-c3-devkitm-1",
    "esp32 c3": "esp32-c3-devkitm-1",
    "esp8266": "esp12e",
    "nodemcu": "nodemcuv2",
    "nodemcu v2": "nodemcuv2",
    "wemos d1": "d1_mini",
    "d1 mini": "d1_mini",
    // Teensy family
    "teensy 4.1": "teensy41",
    "teensy41": "teensy41",
    "teensy 4.0": "teensy40",
    "teensy40": "teensy40",
    "teensy 3.6": "teensy36",
    "teensy36": "teensy36",
    "teensy 3.5": "teensy35",
    "teensy 3.2": "teensy31",
    "teensy lc": "teensylc",
    // STM32
    "bluepill": "bluepill_f103c8",
    "blue pill": "bluepill_f103c8",
    "stm32 bluepill": "bluepill_f103c8",
    "blackpill": "blackpill_f411ce",
    "black pill": "blackpill_f411ce",
    "stm32f4": "genericSTM32F407VET6",
    // Raspberry Pi Pico
    "pico": "pico",
    "raspberry pi pico": "pico",
    "rp2040": "pico",
    "pico w": "rpipicow",
    "raspberry pi pico w": "rpipicow",
    // Adafruit
    "feather m0": "adafruit_feather_m0",
    "feather m4": "adafruit_feather_m4",
    "circuit playground": "adafruit_circuitplayground_m0"
};
//# sourceMappingURL=platformioManager.js.map