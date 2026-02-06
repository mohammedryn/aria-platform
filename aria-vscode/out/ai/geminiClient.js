"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
class GeminiClient {
    static async analyzeCode(input) {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get('apiModel') || "gemini-2.0-flash";
        if (!apiKey) {
            logger_1.Logger.log("[A.R.I.A] AI unavailable — running in dry mode");
            return this.mockAnalysis(input);
        }
        apiKey = apiKey.trim();
        const prompt = this.constructPrompt(input);
        // Build list of models to try: preferred first, then fallbacks
        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError = null;
        for (const model of modelsToTry) {
            try {
                logger_1.Logger.log(`[A.R.I.A] Trying AI Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                logger_1.Logger.log(`[A.R.I.A] Success with model: ${model}`);
                return this.parseResponse(response);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.Logger.log(`[A.R.I.A] Model ${model} failed: ${lastError.message}`);
                // Continue to next model
            }
        }
        // If all failed
        logger_1.Logger.log(`[A.R.I.A] All models failed. Last error: ${lastError?.message}`);
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
    static async logAvailableModels(apiKey) {
        try {
            logger_1.Logger.log("[A.R.I.A] Running Auto-Diagnostic: Listing available models...");
            const response = await fetch(`${this.BASE_URL}?key=${apiKey}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const text = await response.text();
                logger_1.Logger.log(`[A.R.I.A] Diagnostic Failed: API ${response.status} - ${text}`);
                return;
            }
            const data = await response.json();
            if (data.models) {
                const modelNames = data.models.map((m) => m.name.replace('models/', ''));
                logger_1.Logger.log(`[A.R.I.A] SUCCESS! Your API Key has access to these models:\n${modelNames.join('\n')}`);
                logger_1.Logger.log("[A.R.I.A] RECOMMENDATION: Set 'aria.apiModel' in settings to one of the above.");
            }
            else {
                logger_1.Logger.log(`[A.R.I.A] Diagnostic Warning: No models found in response.`);
            }
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Diagnostic Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    static constructPrompt(input) {
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
    static async callGemini(apiKey, model, body, retries = 1) {
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
                logger_1.Logger.log(`[A.R.I.A] Rate limit hit for ${model}. Retrying in 2s...`);
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
                }
                catch { }
                throw new Error(`API ${response.status} - ${cleanMsg}`);
            }
            return await response.json();
        }
        finally {
            clearTimeout(id);
        }
    }
    static parseResponse(data) {
        try {
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text)
                throw new Error("Empty response from AI");
            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanText);
        }
        catch (e) {
            logger_1.Logger.log("[A.R.I.A] Failed to parse AI response");
            throw e;
        }
    }
    static mockAnalysis(input) {
        return {
            summary: "AI Analysis (Dry Run)",
            detectedIssues: ["API Key missing", "Analysis simulated"],
            recommendations: ["Set GEMINI_API_KEY environment variable", "Check internet connection"],
            confidence: 0.0
        };
    }
}
exports.GeminiClient = GeminiClient;
GeminiClient.BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
GeminiClient.TIMEOUT_MS = 30000;
GeminiClient.FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash"
];
//# sourceMappingURL=geminiClient.js.map