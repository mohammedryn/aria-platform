
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

    /**
     * Maps PlatformIO board IDs to Wokwi board types.
     * Wokwi uses different naming conventions than PlatformIO.
     */
    private static readonly PLATFORMIO_TO_WOKWI: Record<string, string> = {
        // Arduino AVR
        "nanoatmega328": "wokwi-arduino-nano",
        "nanoatmega168": "wokwi-arduino-nano",
        "nano_every": "wokwi-arduino-nano",  // Close approximation
        "uno": "wokwi-arduino-uno",
        "megaatmega2560": "wokwi-arduino-mega",
        "leonardo": "wokwi-arduino-nano",  // Closest approximation
        "micro": "wokwi-arduino-nano",  // Closest approximation

        // ESP32 family
        "esp32dev": "board-esp32-devkit-c-v4",
        "esp32-s3-devkitc-1": "board-esp32-s3-devkitc-1",
        "esp32-c3-devkitm-1": "board-esp32-c3-devkitm-1",
        "esp32-s2-saola-1": "board-esp32-s2-devkitm-1",

        // ESP8266
        "esp12e": "board-esp8266",
        "nodemcuv2": "board-esp8266",
        "d1_mini": "board-esp8266",

        // Teensy family (Wokwi has limited Teensy support)
        "teensy41": "board-teensy41",
        "teensy40": "board-teensy40",

        // Raspberry Pi Pico
        "pico": "board-pi-pico",
        "rpipicow": "board-pi-pico-w",

        // STM32 (limited Wokwi support)
        "bluepill_f103c8": "board-st-nucleo-c031c6",  // Closest approximation
    };

    public static generate(
        workspaceRoot: string,
        boardId: string,
        validationResult: HardwareValidationResult
    ): string {

        // 1. Map PlatformIO board ID to Wokwi board type
        const normalizedBoardId = boardId.toLowerCase().trim();
        let wokwiBoardId = this.PLATFORMIO_TO_WOKWI[normalizedBoardId];

        // Fallback: Try partial matching if exact match not found
        if (!wokwiBoardId) {
            for (const [pioId, wokwiId] of Object.entries(this.PLATFORMIO_TO_WOKWI)) {
                if (normalizedBoardId.includes(pioId) || pioId.includes(normalizedBoardId)) {
                    wokwiBoardId = wokwiId;
                    break;
                }
            }
        }

        // Ultimate fallback based on board family keywords
        if (!wokwiBoardId) {
            if (normalizedBoardId.includes("nano")) wokwiBoardId = "wokwi-arduino-nano";
            else if (normalizedBoardId.includes("uno")) wokwiBoardId = "wokwi-arduino-uno";
            else if (normalizedBoardId.includes("mega")) wokwiBoardId = "wokwi-arduino-mega";
            else if (normalizedBoardId.includes("esp32")) wokwiBoardId = "board-esp32-devkit-c-v4";
            else if (normalizedBoardId.includes("esp8266")) wokwiBoardId = "board-esp8266";
            else if (normalizedBoardId.includes("pico")) wokwiBoardId = "board-pi-pico";
            else if (normalizedBoardId.includes("teensy")) wokwiBoardId = "board-teensy41";
            else wokwiBoardId = "wokwi-arduino-uno";  // Safe default
        }

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
                connections.push([`mcu:${pin}`, `${id}:PWM`, "green", []]);
                // Connect Power (Virtual)
                connections.push([`${id}:GND`, "mcu:GND", "black", []]);
                connections.push([`${id}:V+`, "mcu:5V", "red", []]);

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
                connections.push([`mcu:${stepPin[0]}`, `${driverId}:STEP`, "blue", []]);
                connections.push([`mcu:${dirPin[0]}`, `${driverId}:DIR`, "yellow", []]);
                connections.push([`${driverId}:GND`, "mcu:GND", "black", []]);
                connections.push([`${driverId}:VDD`, "mcu:5V", "red", []]);

                // Connect Driver -> Motor
                connections.push([`${driverId}:1A`, `${id}:A-`, "green", []]);
                connections.push([`${driverId}:1B`, `${id}:A+`, "green", []]);
                connections.push([`${driverId}:2A`, `${id}:B+`, "blue", []]);
                connections.push([`${driverId}:2B`, `${id}:B-`, "blue", []]);

                currentTop += 200;
            }
        }

        // DC Motors (with L293D or L298N H-Bridge)
        if (validationResult.peripherals.includes("dcmotor")) {
            // Find motor-related pins
            const enAPins = usedPins.filter(([p, n]) => /^en[aA]$/i.test(n) || n.toUpperCase().includes("ENA"));
            const enBPins = usedPins.filter(([p, n]) => /^en[bB]$/i.test(n) || n.toUpperCase().includes("ENB"));
            const in1Pins = usedPins.filter(([p, n]) => /^in1$/i.test(n) || n.toUpperCase() === "IN1");
            const in2Pins = usedPins.filter(([p, n]) => /^in2$/i.test(n) || n.toUpperCase() === "IN2");
            const in3Pins = usedPins.filter(([p, n]) => /^in3$/i.test(n) || n.toUpperCase() === "IN3");
            const in4Pins = usedPins.filter(([p, n]) => /^in4$/i.test(n) || n.toUpperCase() === "IN4");

            // Add L293D H-Bridge driver
            const driverId = "hbridge1";
            parts.push({
                type: "wokwi-l293d",
                id: driverId,
                top: currentTop,
                left: leftOffset,
                attrs: {}
            });

            // Add DC Motor for Motor A (if enA and in1/in2 exist)
            if (enAPins.length > 0 || in1Pins.length > 0) {
                const motorAId = "motor1";
                parts.push({
                    type: "wokwi-dc-motor",
                    id: motorAId,
                    top: currentTop - 80,
                    left: leftOffset + 200,
                    attrs: {}
                });

                // Connect MCU -> Driver (Motor A)
                if (enAPins.length > 0) {
                    connections.push([`mcu:${enAPins[0][0]}`, `${driverId}:1EN`, "purple", []]);
                }
                if (in1Pins.length > 0) {
                    connections.push([`mcu:${in1Pins[0][0]}`, `${driverId}:1A`, "blue", []]);
                }
                if (in2Pins.length > 0) {
                    connections.push([`mcu:${in2Pins[0][0]}`, `${driverId}:2A`, "yellow", []]);
                }

                // Connect Driver -> Motor A
                connections.push([`${driverId}:1Y`, `${motorAId}:coil1`, "green", []]);
                connections.push([`${driverId}:2Y`, `${motorAId}:coil2`, "green", []]);
            }

            // Add DC Motor for Motor B (if enB and in3/in4 exist)
            if (enBPins.length > 0 || in3Pins.length > 0) {
                const motorBId = "motor2";
                parts.push({
                    type: "wokwi-dc-motor",
                    id: motorBId,
                    top: currentTop + 100,
                    left: leftOffset + 200,
                    attrs: {}
                });

                // Connect MCU -> Driver (Motor B)
                if (enBPins.length > 0) {
                    connections.push([`mcu:${enBPins[0][0]}`, `${driverId}:3EN`, "purple", []]);
                }
                if (in3Pins.length > 0) {
                    connections.push([`mcu:${in3Pins[0][0]}`, `${driverId}:3A`, "blue", []]);
                }
                if (in4Pins.length > 0) {
                    connections.push([`mcu:${in4Pins[0][0]}`, `${driverId}:4A`, "yellow", []]);
                }

                // Connect Driver -> Motor B
                connections.push([`${driverId}:3Y`, `${motorBId}:coil1`, "orange", []]);
                connections.push([`${driverId}:4Y`, `${motorBId}:coil2`, "orange", []]);
            }

            // Power connections for driver
            connections.push([`${driverId}:GND`, "mcu:GND", "black", []]);
            connections.push([`${driverId}:VCC1`, "mcu:5V", "red", []]);
            connections.push([`${driverId}:VCC2`, "mcu:5V", "red", []]);

            currentTop += 250;
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
