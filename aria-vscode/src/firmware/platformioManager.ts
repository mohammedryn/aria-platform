import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../utils/logger';
import { HardwareContext } from '../context/hardwareContext';

export class PlatformIOManager {
    private static _isBusy = false;
    public static get isBusy() { return this._isBusy; }
    
    /**
     * Detects if a PlatformIO project exists in the current workspace.
     */
    public static async isProjectDetected(): Promise<boolean> {
        const files = await vscode.workspace.findFiles('**/platformio.ini');
        return files.length > 0;
    }

    /**
     * Initializes a new PlatformIO project.
     * @param board The board ID (e.g., 'uno', 'teensy41')
     */
    public static async initProject(board: string, workspaceRoot: string): Promise<boolean> {
        return new Promise((resolve) => {
            Logger.log(`[PlatformIO] Initializing project for board: ${board}...`);
            const cmd = `pio project init --board ${board}`;
            
            cp.exec(cmd, { cwd: workspaceRoot }, (err, stdout, stderr) => {
                if (err) {
                    Logger.log(`[PlatformIO] Init failed: ${stderr}`);
                    vscode.window.showErrorMessage(`PlatformIO Init Failed: ${stderr}`);
                    resolve(false);
                } else {
                    Logger.log(`[PlatformIO] Project initialized successfully.`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Builds the firmware using `pio run`.
     * Returns success status and the full build output.
     */
    public static async buildFirmware(workspaceRoot: string): Promise<{ success: boolean, output: string }> {
        if (this._isBusy) {
            Logger.log("[PlatformIO] Cannot build: PlatformIO is busy.");
            return { success: false, output: "PlatformIO is busy." };
        }
        this._isBusy = true;
        return new Promise((resolve) => {
            Logger.log(`[A.R.I.A] Build started...`);
            Logger.show(); // Show output channel

            let outputBuffer = "";

            const buildProcess = cp.spawn('pio', ['run'], { cwd: workspaceRoot, shell: true });

            buildProcess.stdout.on('data', (data) => {
                const str = data.toString();
                outputBuffer += str;
                Logger.logNoPrefix(str);
            });

            buildProcess.stderr.on('data', (data) => {
                const str = data.toString();
                outputBuffer += str;
                Logger.logNoPrefix(str);
            });

            buildProcess.on('close', (code) => {
                this._isBusy = false;
                if (code === 0) {
                    Logger.log(`[A.R.I.A] Build success`);
                    resolve({ success: true, output: outputBuffer });
                } else {
                    Logger.log(`[A.R.I.A] Build failed with code ${code}`);
                    resolve({ success: false, output: outputBuffer });
                }
            });
        });
    }

    /**
     * Flashes the firmware using `pio run --target upload`.
     * @param port Optional port to specify.
     */
    public static async flashFirmware(workspaceRoot: string, port?: string): Promise<boolean> {
        if (this._isBusy) {
            Logger.log("[PlatformIO] Cannot flash: PlatformIO is busy.");
            return false;
        }
        this._isBusy = true;
        return new Promise((resolve) => {
            Logger.log(`[A.R.I.A] Flash process started...`);
            Logger.show();

            const args = ['run', '--target', 'upload'];
            if (port) {
                args.push('--upload-port', port);
            }

            const flashProcess = cp.spawn('pio', args, { cwd: workspaceRoot, shell: true });

            flashProcess.stdout.on('data', (data) => {
                Logger.logNoPrefix(data.toString());
            });

            flashProcess.stderr.on('data', (data) => {
                Logger.logNoPrefix(data.toString());
            });

            flashProcess.on('close', (code) => {
                this._isBusy = false;
                if (code === 0) {
                    Logger.log(`[A.R.I.A] Upload complete`);
                    resolve(true);
                } else {
                    Logger.log(`[A.R.I.A] Flash aborted/failed with code ${code}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * Lists detected serial ports.
     */
    public static async listPorts(): Promise<string[]> {
        return new Promise((resolve) => {
            cp.exec('pio device list --json-output', (err, stdout, stderr) => {
                if (err) {
                    Logger.log(`[PlatformIO] Failed to list devices: ${stderr}`);
                    resolve([]);
                    return;
                }
                try {
                    const devices = JSON.parse(stdout.toString());
                    // Filter for likely upload ports if needed, but returning all is safer
                    const ports = devices.map((d: any) => d.port);
                    resolve(ports);
                } catch (e) {
                    Logger.log(`[PlatformIO] Error parsing device list: ${e}`);
                    resolve([]);
                }
            });
        });
    }
}
