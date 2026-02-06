
import * as path from 'path';
import * as fs from 'fs';
import { HardwareValidationResult } from '../hardware/validator';

export interface WokwiPart {
    type: string;
    id: string;
    top: number;
    left: number;
    rotate?: number;
    attrs?: Record<string, any>;
}

export interface WokwiConnection {
    [0]: string;
    [1]: string;
    [2]: string;
    [3]: string[];
}

export interface WokwiDiagram {
    version: number;
    author: string;
    editor: string;
    parts: WokwiPart[];
    connections: WokwiConnection[];
}

export class WokwiGenerator {

    public static generate(
        workspaceRoot: string, 
        boardId: string, 
        validationResult: HardwareValidationResult
    ): string {
        
        // 1. Determine Board Type
        let wokwiBoardId = "board-teensy41"; // Default for this project context
        if (boardId.includes("uno")) wokwiBoardId = "wokwi-arduino-uno";
        if (boardId.includes("esp32")) wokwiBoardId = "board-esp32-devkit-c-v4";
        // ... mappings ...

        // 2. Build Parts List
        const parts: WokwiPart[] = [
            { type: wokwiBoardId, id: "mcu", top: 0, left: 0, attrs: {} }
        ];

        const connections: WokwiConnection[] = [];

        // 3. Add Peripherals & Connections (Heuristic)
        let servoCount = 0;
        let stepperCount = 0;

        // Iterate discovered peripherals
        // Note: The Validator is simple, so we might not have exact pin mappings for every object instance.
        // We will try to map based on Pin Usage.
        
        const usedPins = Object.entries(validationResult.pinUsage);

        // Simple Layout Strategy
        let currentTop = -100;
        const leftOffset = 300;

        // Servos
        if (validationResult.peripherals.includes("servo")) {
            // Find pins likely used for servos (PWM pins, or defined as SERVO_PIN)
            // For now, we instantiate based on usage. 
            // If we have 2 servos implied by code, we add 2.
            // But validator just says "servo" present.
            
            // Let's scan defined pins for "SERVO" in name
            const servoPins = usedPins.filter(([pin, name]) => name.toUpperCase().includes("SERVO"));
            
            servoPins.forEach(([pin, name]) => {
                const id = `servo${++servoCount}`;
                parts.push({
                    type: "wokwi-servo",
                    id: id,
                    top: currentTop,
                    left: leftOffset,
                    attrs: { "horn": "cross" }
                });
                // Connect Signal
                connections.push([ `mcu:${pin}`, `${id}:PWM`, "green", [] ]);
                // Connect Power (Virtual)
                connections.push([ `${id}:GND`, "mcu:GND", "black", [] ]);
                connections.push([ `${id}:V+`, "mcu:5V", "red", [] ]);
                
                currentTop += 120;
            });
        }

        // Steppers
        if (validationResult.peripherals.includes("stepper")) {
             // Find STEP/DIR pins
             const stepPin = usedPins.find(([p, n]) => n.toUpperCase().includes("STEP"));
             const dirPin = usedPins.find(([p, n]) => n.toUpperCase().includes("DIR"));
             
             if (stepPin && dirPin) {
                 const id = `stepper${++stepperCount}`;
                 const driverId = `driver${stepperCount}`;
                 
                 // Add A4988 Driver
                 parts.push({
                     type: "wokwi-a4988",
                     id: driverId,
                     top: currentTop,
                     left: leftOffset,
                     attrs: {}
                 });
                 
                 // Add Stepper Motor
                 parts.push({
                     type: "wokwi-stepper-motor",
                     id: id,
                     top: currentTop - 50,
                     left: leftOffset + 150,
                     attrs: {}
                 });
                 
                 // Connect MCU -> Driver
                 connections.push([ `mcu:${stepPin[0]}`, `${driverId}:STEP`, "blue", [] ]);
                 connections.push([ `mcu:${dirPin[0]}`, `${driverId}:DIR`, "yellow", [] ]);
                 connections.push([ `${driverId}:GND`, "mcu:GND", "black", [] ]);
                 connections.push([ `${driverId}:VDD`, "mcu:5V", "red", [] ]);
                 
                 // Connect Driver -> Motor
                 connections.push([ `${driverId}:1A`, `${id}:A-`, "green", [] ]);
                 connections.push([ `${driverId}:1B`, `${id}:A+`, "green", [] ]);
                 connections.push([ `${driverId}:2A`, `${id}:B+`, "blue", [] ]);
                 connections.push([ `${driverId}:2B`, `${id}:B-`, "blue", [] ]);
                 
                 currentTop += 200;
             }
        }

        const diagram: WokwiDiagram = {
            version: 1,
            author: "A.R.I.A",
            editor: "wokwi",
            parts: parts,
            connections: connections
        };

        return JSON.stringify(diagram, null, 2);
    }

    public static createProjectFiles(workspacePath: string, content: string, boardId: string): void {
        const wokwiDir = path.join(workspacePath, '.wokwi');
        if (!fs.existsSync(wokwiDir)) {
            fs.mkdirSync(wokwiDir);
        }

        const diagramPath = path.join(wokwiDir, 'diagram.json');
        fs.writeFileSync(diagramPath, content);

        const readmePath = path.join(wokwiDir, 'README.md');
        const readmeContent = `# Wokwi Simulation Artifacts

Generated by A.R.I.A. for VS Code.

## How to Run
1. Install the [Wokwi Simulator for VS Code](https://marketplace.visualstudio.com/items?itemName=Wokwi.wokwi-vscode) extension.
2. Open \`.wokwi/diagram.json\`.
3. Click "Start Simulation".

## Assumptions
- Board: Auto-detected based on PlatformIO context.
- Connections: Inferred from pin definitions in your code (e.g., #define STEP_PIN).
- Power: Ground and VCC connections are assumed for standard modules.
`;
        fs.writeFileSync(readmePath, readmeContent);

        // Generate wokwi.toml at the workspace root
        const tomlPath = path.join(workspacePath, 'wokwi.toml');
        
        // Simple heuristic for firmware path based on boardId
        // In a real scenario, we might want to parse platformio.ini to find the env name
        // But often env name == board name or is explicit. 
        // We'll assume the env name matches the boardId for now, or just use a placeholder the user might need to edit.
        const envName = boardId.replace('board-', ''); // e.g. board-teensy41 -> teensy41
        
        const tomlContent = `[wokwi]
version = 1
firmware = '.pio/build/${envName}/firmware.hex'
elf = '.pio/build/${envName}/firmware.elf'
diagram = '.wokwi/diagram.json'
`;
        fs.writeFileSync(tomlPath, tomlContent);
    }
}
