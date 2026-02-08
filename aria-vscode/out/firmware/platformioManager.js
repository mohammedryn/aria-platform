"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformIOManager = void 0;
const vscode = require("vscode");
const cp = require("child_process");
const logger_1 = require("../utils/logger");
class PlatformIOManager {
    static get isBusy() { return this._isBusy; }
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
            const cmd = `pio project init --board ${board}`;
            cp.exec(cmd, { cwd: workspaceRoot }, (err, stdout, stderr) => {
                if (err) {
                    logger_1.Logger.log(`[PlatformIO] Init failed: ${stderr}`);
                    vscode.window.showErrorMessage(`PlatformIO Init Failed: ${stderr}`);
                    resolve(false);
                }
                else {
                    logger_1.Logger.log(`[PlatformIO] Project initialized successfully.`);
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
//# sourceMappingURL=platformioManager.js.map