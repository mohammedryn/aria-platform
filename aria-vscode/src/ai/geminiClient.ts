import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { AnalysisInput, AnalysisOutput } from './types';

export class GeminiClient {
    private static readonly BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
    private static readonly TIMEOUT_MS = 30000;
    private static readonly FALLBACK_MODELS = [
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash"
    ];

    public static async analyzeCode(input: AnalysisInput): Promise<AnalysisOutput> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get<string>('apiModel') || "gemini-2.0-flash";

        if (!apiKey) {
            Logger.log("[A.R.I.A] AI unavailable — running in dry mode");
            return this.mockAnalysis(input);
        }

        apiKey = apiKey.trim();
        const prompt = this.constructPrompt(input);

        // Build list of models to try: preferred first, then fallbacks
        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                Logger.log(`[A.R.I.A] Trying AI Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                Logger.log(`[A.R.I.A] Success with model: ${model}`);
                return this.parseResponse(response);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] Model ${model} failed: ${lastError.message}`);
                // Continue to next model
            }
        }

        // If all failed
        Logger.log(`[A.R.I.A] All models failed. Last error: ${lastError?.message}`);
        
        // AUTO-DIAGNOSTIC: Try to list available models to see what IS working
        await this.logAvailableModels(apiKey);

        const isRateLimit = lastError?.message.includes("429") || lastError?.message.includes("Quota");
        const summary = isRateLimit ? "AI Busy (Rate Limit)" : "AI Analysis Failed";
        const errorDetail = isRateLimit 
            ? "You hit the free tier rate limit. Please wait a moment and try again." 
            : `Last Error: ${lastError?.message}`;

        return {
            summary: summary,
            detectedIssues: isRateLimit ? ["Rate Limit Exceeded"] : ["API Connection Error", "Invalid Model/Key"],
            recommendations: [
                "Check A.R.I.A Logs for 'Available Models'",
                "Check API Key permissions", 
                "Try changing 'aria.apiModel' in settings",
                errorDetail
            ],
            confidence: 0.0
        };
    }
    
    private static async logAvailableModels(apiKey: string): Promise<void> {
        try {
            Logger.log("[A.R.I.A] Running Auto-Diagnostic: Listing available models...");
            const response = await fetch(`${this.BASE_URL}?key=${apiKey}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                const text = await response.text();
                Logger.log(`[A.R.I.A] Diagnostic Failed: API ${response.status} - ${text}`);
                return;
            }

            const data: any = await response.json();
            if (data.models) {
                const modelNames = data.models.map((m: any) => m.name.replace('models/', ''));
                Logger.log(`[A.R.I.A] SUCCESS! Your API Key has access to these models:\n${modelNames.join('\n')}`);
                Logger.log("[A.R.I.A] RECOMMENDATION: Set 'aria.apiModel' in settings to one of the above.");
            } else {
                Logger.log(`[A.R.I.A] Diagnostic Warning: No models found in response.`);
            }
        } catch (e) {
            Logger.log(`[A.R.I.A] Diagnostic Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    private static constructPrompt(input: AnalysisInput): string {
        const contextSection = input.hardwareContext 
            ? `\nCONTEXT:\n${input.hardwareContext}\n` 
            : "";

        return JSON.stringify({
            system_instruction: {
                parts: { text: "You are a hardware-aware code analysis engine (A.R.I.A). You understand embedded systems (PlatformIO, Arduino, ESP32, Teensy). Output ONLY valid JSON." }
            },
            contents: {
                parts: {
                    text: `Analyze this ${input.language} code from ${input.filePath}:\n${contextSection}\nCODE:\n${input.code}\n\nReturn JSON with schema: { summary: string, detectedIssues: string[], recommendations: string[], suggestions?: { description: string, diff: string }[], confidence: number (0-1) }.\nIf proposing changes, return UNIFIED DIFFS (with headers like @@ -1,1 +1,1 @@) that can be applied directly to the current file. Do not rewrite the entire file. Keep diffs minimal and focused on fixes.`
                }
            }
        });
    }

    private static async callGemini(apiKey: string, model: string, body: string, retries = 1): Promise<any> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
        const url = `${this.BASE_URL}/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
                signal: controller.signal
            });

            if (response.status === 429 && retries > 0) {
                 Logger.log(`[A.R.I.A] Rate limit hit for ${model}. Retrying in 2s...`);
                 await new Promise(resolve => setTimeout(resolve, 2000));
                 clearTimeout(id); // Clear previous timeout
                 return this.callGemini(apiKey, model, body, retries - 1);
            }

            if (!response.ok) {
                const errorText = await response.text();
                let cleanMsg = errorText;
                try {
                    const errObj = JSON.parse(errorText);
                    if (errObj.error && errObj.error.message) {
                        cleanMsg = errObj.error.message;
                    }
                } catch {}
                throw new Error(`API ${response.status} - ${cleanMsg}`);
            }

            return await response.json();
        } finally {
            clearTimeout(id);
        }
    }

    private static parseResponse(data: any): AnalysisOutput {
        try {
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Empty response from AI");
            
            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanText) as AnalysisOutput;
        } catch (e) {
            Logger.log("[A.R.I.A] Failed to parse AI response");
            throw e;
        }
    }

    private static mockAnalysis(input: AnalysisInput): AnalysisOutput {
        return {
            summary: "AI Analysis (Dry Run)",
            detectedIssues: ["API Key missing", "Analysis simulated"],
            recommendations: ["Set GEMINI_API_KEY environment variable", "Check internet connection"],
            confidence: 0.0
        };
    }
}
