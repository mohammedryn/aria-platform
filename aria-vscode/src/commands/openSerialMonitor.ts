import * as vscode from 'vscode';
import { SerialManager } from '../serial/serialManager';
import { PlatformIOManager } from '../firmware/platformioManager';

export async function openSerialMonitorCommand() {
    const ports = await PlatformIOManager.listPorts();
    
    let port: string | undefined;
    if (ports.length === 0) {
        port = await vscode.window.showInputBox({ 
            prompt: "No ports detected. Enter manual port (e.g. COM3 or /dev/ttyUSB0)" 
        });
    } else if (ports.length === 1) {
        port = ports[0];
    } else {
        port = await vscode.window.showQuickPick(ports, { 
            placeHolder: "Select Serial Port" 
        });
    }

    if (!port) return;

    const baudStr = await vscode.window.showInputBox({
        prompt: "Enter Baud Rate",
        value: "9600",
        validateInput: (value) => {
            return isNaN(parseInt(value)) ? "Please enter a number" : null;
        }
    });

    if (!baudStr) return;
    const baud = parseInt(baudStr);

    await SerialManager.startSession(port, baud);
    vscode.window.showInformationMessage(`Serial Monitor started on ${port} @ ${baud}`);
}
