import { GeminiClient } from '../ai/geminiClient';
import { Logger } from '../utils/logger';

export interface VisionResult {
    detectedBoards: string[];
    detectedComponents: string[];
    confidence: number;
    disclaimers: string[];
}

export class VisionClient {
    private static readonly SYSTEM_PROMPT = `
    You are an assistive hardware vision system for an IDE. 
    Your goal is to identify hardware components from an image to help configure the development environment.
    
    STRICT RULES:
    1. Identify only visually obvious hardware components (boards, sensors, actuators).
    2. If unsure, say 'unknown' or omit it.
    3. Do NOT infer electrical connections or wiring correctness.
    4. Do NOT guess pin mappings or voltages.
    5. Vision is evidence, not truth. Be conservative.

    Return ONLY a JSON object with this structure:
    {
        "detectedBoards": string[], // e.g. ["Arduino Uno", "ESP32"]
        "detectedComponents": string[], // e.g. ["servo", "DHT11", "breadboard"]
        "confidence": number, // 0.0 to 1.0 based on image clarity
        "disclaimers": string[] // e.g. ["Cannot verify pin connections", "Lighting is poor"]
    }
    `;

    public static async analyze(base64Image: string): Promise<VisionResult> {
        try {
            const result = await GeminiClient.analyzeImage(base64Image, this.SYSTEM_PROMPT);
            
            // Validate schema roughly
            if (!result.detectedBoards || !Array.isArray(result.detectedBoards)) {
                result.detectedBoards = [];
            }
            if (!result.detectedComponents || !Array.isArray(result.detectedComponents)) {
                result.detectedComponents = [];
            }
            if (typeof result.confidence !== 'number') {
                result.confidence = 0.5;
            }
            if (!result.disclaimers || !Array.isArray(result.disclaimers)) {
                result.disclaimers = [];
            }

            return result as VisionResult;
        } catch (e) {
            Logger.log(`[VisionClient] Analysis failed: ${e}`);
            return {
                detectedBoards: [],
                detectedComponents: [],
                confidence: 0,
                disclaimers: ["Vision analysis failed to execute."]
            };
        }
    }
}
