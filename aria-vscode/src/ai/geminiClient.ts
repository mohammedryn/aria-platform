import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Logger } from '../utils/logger';
import { AnalysisInput, AnalysisOutput, SerialAnalysisResult } from './types';
import { AIPatchResponse } from './protocols/patchProtocol';

export class GeminiClient {
    private static readonly BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
    private static readonly UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";
    private static readonly TIMEOUT_MS = 45000; // Reduced to 45s for faster feedback
    private static readonly FALLBACK_MODELS = [
        "gemini-3-flash-preview", // Try flash again or similar
        "gemini-2.0-flash-lite-001", // Faster fallback
        "gemini-2.5-flash",
        "gemini-3-pro-preview", // Last resort (slowest)
        "gemini-2.0-flash-001",
        "gemini-2.0-flash",
        "gemini-flash-latest"
    ];

    public static async analyzeCode(input: AnalysisInput): Promise<AnalysisOutput> {
        // ... (existing implementation) ...
        // We keep analyzeCode for general use but modify prompt structure if needed
        // For now, let's just add the new method and use that instead.
        return this._internalAnalyze(input, false);
    }

    public static async fixBuildError(errorLog: string, codeContext: string, filePath: string): Promise<AnalysisOutput> {
        return this._internalAnalyze({
            code: codeContext,
            filePath: filePath,
            source: 'build_error',
            language: 'cpp',
            taskDescription: `FIX COMPILATION ERROR:\n${errorLog}\n\nSTRICT INSTRUCTION: Return a UNIFIED DIFF that fixes the error. DO NOT rewrite the entire file.`
        }, true);
    }

    public static async analyzeCodeJson(input: AnalysisInput): Promise<AIPatchResponse> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get<string>('apiModel') || "gemini-3-flash-preview";

        if (!apiKey) {
            throw new Error("Gemini API Key missing.");
        }
        apiKey = apiKey.trim();

        const contextSection = input.context ? `CONTEXT:\n${input.context}\n\n` : "";
        let visionSection = "";
        if (input.visionContext) {
            visionSection = `VISION ANALYSIS (Advisory Only):\n` +
                `- Detected Boards: ${input.visionContext.boards.join(', ')}\n` +
                `- Detected Components: ${input.visionContext.components.join(', ')}\n` +
                `- Confidence: ${input.visionContext.confidence}\n\n`;
        }

        const taskDescription = input.taskDescription || "Analyze this code for bugs and improvements.";
        
        // Calculate hash to ensure patch validity (Normalize line endings to \n)
        const normalizedCode = input.code.replace(/\r\n/g, '\n');
        const fileHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

        const systemInstruction = `You are A.R.I.A, a hardware-aware code analysis engine.
You respond ONLY in RAW JSON format.
NO Markdown. NO Code Fences. NO Explanations outside JSON.

Response Schema (TypeScript Interface):
{
  file_hash: string; // SHA256 of the input file content (MUST match the hash provided in prompt)
  summary: string; // Short summary of changes
  edits: Array<{
    file_path: string; // Relative path
    operation: 'replace' | 'insert_after' | 'delete' | 'create';
    start_line: number; // 1-based index
    end_line?: number; // 1-based index (required for replace/delete)
    content?: string; // Content to insert/replace
    explanation: string; // Reasoning
  }>
}

Rules:
- 'replace': Replaces lines from start_line to end_line (inclusive) with content.
- 'insert_after': Inserts content after start_line.
- 'delete': Deletes lines from start_line to end_line (inclusive).
- 'create': Creates a new file.
- Do NOT output markdown formatting like \`\`\`json. Return raw JSON only.
`;

        const prompt = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: {
                parts: {
                    text: `Analyze this ${input.language} content from ${input.filePath}:\n${contextSection}${visionSection}\nFILE CONTENT (SHA256: ${fileHash}):\n${input.code}\n\n` +
                        `${taskDescription}\n` +
                        `\nReturn valid JSON matching the schema. Ensure file_hash is "${fileHash}".`
                }
            },
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                Logger.log(`[A.R.I.A] Analyzing JSON with Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                
                // Parse Response
                if (!response?.candidates?.[0]?.content?.parts?.length) {
                    throw new Error("Invalid Gemini response structure");
                }
                const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Empty response");

                const json = JSON.parse(text.trim()) as AIPatchResponse;

                if (!json.file_hash) {
                    throw new Error("Patch missing required file_hash");
                }

                if (json.file_hash !== fileHash) {
                    throw new Error(`Hash mismatch: AI returned ${json.file_hash}, expected ${fileHash}. File may have been hallucinated.`);
                }

                return json;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] JSON Analysis failed with ${model}: ${lastError.message}`);
            }
        }

        throw lastError || new Error("All models failed");
    }

    private static async _internalAnalyze(input: AnalysisInput, isBuildFix: boolean): Promise<AnalysisOutput> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get<string>('apiModel') || "gemini-3-flash-preview";

        if (!apiKey) {
            return {
                summary: "Gemini API Key missing. Please set 'aria.apiKey' in VS Code settings or GEMINI_API_KEY env var.",
                detectedIssues: ["Configuration Error"],
                recommendations: ["Get an API key from Google AI Studio", "Set aria.apiKey in settings"],
                confidence: 0
            };
        }

        apiKey = apiKey.trim();

        const contextSection = input.context ? `CONTEXT:\n${input.context}\n\n` : "";

        let visionSection = "";
        if (input.visionContext) {
            visionSection = `VISION ANALYSIS (Advisory Only):\n` +
                `- Detected Boards: ${input.visionContext.boards.join(', ')}\n` +
                `- Detected Components: ${input.visionContext.components.join(', ')}\\n` +
                `- Confidence: ${input.visionContext.confidence}\n\n`;
        }

        const codeLabel = input.source === 'selection' ? "SELECTED CODE" : "FILE CONTENT";

        // Make the task description more explicit about hardware
        const isFullFileAnalysis = input.source === 'file';

        const taskDescription = input.taskDescription || "Analyze this code for bugs, hardware compatibility issues, and improvements.";

        const systemInstruction = "You are A.R.I.A, a hardware-aware code analysis engine. " +
            "You understand embedded systems (PlatformIO, Arduino, ESP32, Teensy). " +
            "Use Markdown for formatting. \n\n" +
            "CRITICAL: Always cross-reference detected boards/components with the code.\n" +
            "IMPORTANT OUTPUT FORMAT:\n" +
            "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
            "2. Follow with a section header '# Final Summary' containing the direct answer to the user.\n" +
            "3. If providing code fixes, you MUST use the headers '--- <filename>' and '+++ <filename>'.\n" +
            "This structure is REQUIRED.";

        const outputFormat = isBuildFix
            ? `\nTASK: Fix the compilation error defined below.\n` +
            `1. Under '# Thinking Process', analyze the error log and the code.\n` +
            `2. Under '# Final Summary', explain the fix briefly.\n` +
            `3. Add a section '# Suggestions' with ONE UNIFIED DIFF that fixes the error.\n` +
            `   - MUST start with headers: --- filename, +++ filename\n` +
            `   - Use standard diff format (@@ -L,C +L,C @@).\n` +
            `   - Context lines (space), Added (+), Deleted (-).\n` +
            `   - DO NOT rewrite the whole file. Only change the lines needed.\n`
            : (isFullFileAnalysis
                ? `\nSpecific Task: Provide a COMPLETE, CORRECTED version of the user's file.\n` +
                `1. Under '# Thinking Process', analyze the issues.\n` +
                `2. Under '# Final Summary', summarize changes.\n` +
                `3. Add a section '# Corrected Code' containing the COMPLETE file.\n` +
                `   - YOU MUST start the code block with: --- filename, +++ filename\n` +
                `   - Return the ENTIRE file from start to finish.\n`
                : `\nSpecific Task: Analyze code and suggest fixes.\n` +
                `1. Under '# Thinking Process', analyze the code.\n` +
                `2. Under '# Final Summary', summarize the issue and fix.\n` +
                `3. Add a section '# Recommendations' for bullet points.\n` +
                `4. Add a section '# Suggestions' with ONE unified diff (with headers).\n`);

        const prompt = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: {
                parts: {
                    text: `Analyze this ${input.language} content from ${input.filePath}:\n${contextSection}${visionSection}\n${codeLabel}:\n${input.code}\n\n` +
                        `${taskDescription}\n` +
                        outputFormat +
                        `\nEXAMPLE OUTPUT FORMAT:\n` +
                        `# Thinking Process\n[Analysis...]\n\n# Final Summary\n[Summary...]\n\n` +
                        (isBuildFix ? `# Suggestions\n\`\`\`diff\n--- file.cpp\n+++ file.cpp\n@@ -10,1 +10,1 @@\n-old_line;\n+new_line;\n\`\`\``
                            : `# Corrected Code\n\`\`\`${input.language}\n[FULL CODE HERE]\n\`\`\``)
                }
            }
        };

        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                Logger.log(`[A.R.I.A] Trying AI Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                return this.parseResponse(response);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] Model ${model} failed: ${lastError.message}`);
            }
        }

        throw lastError || new Error("All models failed");
    }

    public static async analyzeProject(files: { path: string, content: string }[], hardwareContext: string, visionContext?: any): Promise<AnalysisOutput> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get<string>('apiModel') || "gemini-3-flash-preview";

        if (!apiKey) {
            return {
                summary: "Gemini API Key missing.",
                detectedIssues: ["Configuration Error"],
                recommendations: ["Set aria.apiKey"],
                confidence: 0
            };
        }
        apiKey = apiKey.trim();

        let fileContentStr = "";
        for (const f of files) {
            fileContentStr += `\n=== FILE: ${f.path} ===\n${f.content}\n`;
        }

        let visionSection = "";
        if (visionContext) {
            visionSection = `\nVISUAL HARDWARE CONTEXT (Advisory Only):\n` +
                `- Detected Boards: ${visionContext.boards.join(', ')}\n` +
                `- Detected Components: ${visionContext.components.join(', ')}\n` +
                `- Confidence: ${visionContext.confidence}\n`;
        }

        const prompt = {
            system_instruction: {
                parts: {
                    text: "You are A.R.I.A, a hardware-aware code analysis engine. Analyze the entire project context. Find cross-file issues, logical errors, and hardware mismatches. " +
                        "Use Markdown for formatting. \n\n" +
                        "CRITICAL: Always cross-reference detected boards/components with the code.\n" +
                        "IMPORTANT OUTPUT FORMAT:\n" +
                        "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
                        "2. Follow with a section header '# Final Summary' containing the direct answer to the user.\n" +
                        "3. If providing code fixes, you MUST use the headers '--- <filename>' and '+++ <filename>'.\n" +
                        "This structure is REQUIRED."
                }
            },
            contents: {
                parts: {
                    text: `Analyze this project:\n` +
                        `HARDWARE CONTEXT: ${hardwareContext}\n${visionSection}\n` +
                        `PROJECT FILES:\n${fileContentStr}\n\n` +
                        `Task:\n` +
                        `1. Identify issues spanning multiple files or within specific files.\n` +
                        `2. Under '# Thinking Process', analyze the issues.\n` +
                        `3. Under '# Final Summary', summarize the issues.\n` +
                        `4. Add '# Recommendations'.\n` +
                        `5. Add '# Suggestions' for each file that needs changes.\n` +
                        `   - **Option A (Unified Diff):** Use for small changes. Start with '--- <filepath>' and '+++ <filepath>'.\n` +
                        `   - **Option B (Full Rewrite):** Use for large changes or rewrites. Provide the FULL NEW CONTENT. You MUST start with '--- <filepath>' and '+++ <filepath>' headers to identify the file, but DO NOT use '@@ ... @@' hunks.\n` +
                        `   - Use relative paths matching the provided filenames (e.g. 'src/main.cpp').\n` +
                        `   - Provide ONE unified diff OR full rewrite per file that fixes ALL issues in that file.\n` +
                        `   - Do NOT output partial or incomplete lines. Include at least 3 lines of context (unchanged lines) around changes.\n` +
                        `   - NEVER use placeholders like '...' or '// ...' in context lines. You must use the EXACT original code for context.\n` +
                        `   - Ensure valid unified diff syntax (lines start with ' ', '+', or '-').\n` +
                        `   - Treat each file with the same rigor as a single-file analysis. Do not skip details.\n` +
                        `\nEXAMPLE RESPONSE FORMAT:\n` +
                        `# Thinking Process\n[Analysis...]\n\n# Final Summary\n[Summary...]\n\n# Recommendations\n- [Rec 1]\n\n# Suggestions\n` +
                        `\`\`\`diff\n` +
                        `--- src/main.cpp\n` +
                        `+++ src/main.cpp\n` +
                        `@@ -10,4 +10,4 @@\n` +
                        ` void loop() {\n` +
                        `-  int x = 0\n` +
                        `+  int x = 0;\n` +
                        `   // Comment\n` +
                        ` }\n` +
                        `\`\`\`\n`
                }
            }
        };

        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError: Error | null = null;
        let successfulModel = "";

        for (const model of modelsToTry) {
            try {
                Logger.log(`[A.R.I.A] Analyzing Project with Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                successfulModel = model;
                const result = this.parseResponse(response);
                // @ts-ignore - Inject model name into result metadata if needed later, 
                // but mostly we rely on the caller to know which model was requested or 
                // we can return it. For now, let's just return the result.
                // We'll attach the model name in the analyzeWorkspace command.
                (result as any).usedModel = successfulModel;
                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] Project analysis failed with ${model}: ${lastError.message}`);
            }
        }

        throw lastError || new Error("All models failed");
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

    private static constructPrompt(input: AnalysisInput): any {
        const contextSection = input.hardwareContext
            ? `\nFIRMWARE HARDWARE CONTEXT:\n${input.hardwareContext}\n`
            : "";

        let visionSection = "";
        if (input.visionContext) {
            visionSection = `\nVISUAL HARDWARE CONTEXT (Advisory Only):\n` +
                `- Detected Boards: ${input.visionContext.boards.join(', ')}\n` +
                `- Detected Components: ${input.visionContext.components.join(', ')}\n` +
                `- Confidence: ${input.visionContext.confidence}\n` +
                `NOTE: Visual context is auxiliary. Never override explicit firmware definitions based solely on vision. Do not guess pin numbers from image.\n`;
        }

        const taskDescription = input.source === 'terminal'
            ? `Task (TERMINAL ERROR ANALYSIS):\n` +
            `1. Analyze the terminal output/error log provided below.\n` +
            `2. Identify the root cause of the error (e.g., compilation error, linker error, upload failure).\n` +
            `3. If a specific file is mentioned in the error, assume the user wants to fix THAT file.\n` +
            `4. Suggest a code fix using a UNIFIED DIFF if possible. If the error requires deleting a file or changing a configuration, explain it clearly in 'recommendations'.\n` +
            `5. IMPORTANT: If providing a diff, ensure it targets the file causing the error. If you don't have the file content, provide a descriptive recommendation instead of a diff.\n`
            : `Task:\n` +
            `1. Analyze code for errors and inefficiencies.\n` +
            `2. Cross-check code against FIRMWARE HARDWARE CONTEXT (if present).\n` +
            `3. If VISUAL HARDWARE CONTEXT is present:\n` +
            `   - Check if visual components (e.g., Servos, Sensors) are used in the code. If not, suggest adding them.\n` +
            `   - Check for conflicts between Firmware Context (e.g. Board Type) and Visual Context. If they mismatch, warn the user.\n`;

        const codeLabel = input.source === 'terminal' ? "TERMINAL OUTPUT" : "CODE";

        return {
            system_instruction: {
                parts: {
                    text: "You are A.R.I.A, a hardware-aware code analysis engine. " +
                        "Use Markdown for formatting. \n\n" +
                        "CRITICAL: Always cross-reference detected boards/components with the code.\n" +
                        "IMPORTANT OUTPUT FORMAT:\n" +
                        "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
                        "2. Follow with a section header '# Final Summary' containing the direct answer to the user.\n" +
                        "3. If providing code fixes, you MUST use the headers '--- <filename>' and '+++ <filename>'.\n" +
                        "This structure is REQUIRED."
                }
            },
            contents: {
                parts: {
                    text: `Analyze this ${input.language} content from ${input.filePath}:\n${contextSection}${visionSection}\n${codeLabel}:\n${input.code}\n\n` +
                        `${taskDescription}\n` +
                        `\nOutput the result in plain text with a clear "Thinking Process" section followed by the final "Summary" and "Recommendations". Use markdown code blocks for diffs.\n` +
                        `If proposing changes, provide ONE unified diff that fixes ALL issues found. Do not output partial or incomplete lines. Every added line must be syntactically complete.\n` +
                        `The diff must include ---/+++ headers and @@ hunks and be directly applicable to the current file. Keep it minimal and focused on fixes.\n` +
                        `IMPORTANT: Do NOT include comments, explanations, or prose INSIDE the \`\`\`diff block. Only valid unified diff syntax is allowed inside the block.\n\n` +
                        `EXAMPLE OUTPUT FORMAT:\n` +
                        `# Thinking Process\n[Analysis details...]\n\n# Final Summary\n[Summary of issue]\n\n# Recommendations\n- [Recommendation 1]\n- [Recommendation 2]\n\n# Suggestions\n\`\`\`diff\n--- src/main.cpp\n+++ src/main.cpp\n@@ -1,1 +1,1 @@\n-old line\n+new line\n\`\`\``
                }
            }
        };
    }

    public static async uploadFile(filePath: string, mimeType: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('aria');
        const apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const stats = await fs.promises.stat(filePath);
        const size = stats.size;
        const name = filePath.split(/[/\\]/).pop();

        Logger.log(`[A.R.I.A] Starting upload for ${name} (${size} bytes)...`);

        // 1. Start Resumable Upload
        const startResponse = await fetch(`${this.UPLOAD_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': size.toString(),
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file: { display_name: name } })
        });

        if (!startResponse.ok) {
            const err = await startResponse.text();
            throw new Error(`Upload start failed: ${startResponse.statusText} - ${err}`);
        }

        const uploadUrl = startResponse.headers.get('x-goog-upload-url');
        if (!uploadUrl) throw new Error("No upload URL returned from Gemini API");

        // 2. Upload Content
        const fileBuffer = await fs.promises.readFile(filePath);
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize'
            },
            body: fileBuffer
        });

        if (!uploadResponse.ok) {
            const err = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.statusText} - ${err}`);
        }

        const result = await uploadResponse.json() as any;
        Logger.log(`[A.R.I.A] Upload complete. URI: ${result.file.uri}`);
        return result.file.uri;
    }

    public static async waitForFileActive(fileUri: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aria');
        const apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        Logger.log(`[A.R.I.A] Waiting for file processing: ${fileUri}...`);

        // Polling loop
        for (let i = 0; i < 60; i++) { // Max 120 seconds
            const response = await fetch(`${fileUri}?key=${apiKey}`);
            if (!response.ok) throw new Error(`Failed to check file status: ${response.statusText}`);

            const data = await response.json() as any;
            Logger.log(`[A.R.I.A] File state: ${data.state}`);

            if (data.state === "ACTIVE") return;
            if (data.state === "FAILED") throw new Error("File processing failed on Gemini side.");

            await new Promise(r => setTimeout(r, 2000));
        }
        throw new Error("File processing timed out.");
    }

    public static async generateVideoScript(prompt: string): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = "gemini-3-pro-preview";

        if (!apiKey) {
            throw new Error("Gemini API Key missing.");
        }
        apiKey = apiKey.trim();

        // STRICT SYSTEM INSTRUCTION (No Roleplay)
        const systemInstruction =
            "You are a code generation backend. You receive a query and output ONLY the raw HTML/SVG file content.\n" +
            "DO NOT Output 'Here is the code'.\n" +
            "DO NOT Output 'Thinking Process'.\n" +
            "DO NOT Output Markdown blocks.\n" +
            "Output Format: Raw string starting with '<!DOCTYPE html>' or '<svg'.\n" +
            "The content must be a Self-Contained HTML5 Animation demonstrating: " + prompt;

        const payload = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: [{
                parts: [{ text: "OUTPUT_FILE_CONTENT_ONLY: YES" }] // Dummy user message to just trigger the system prompt instruction
            }],
            generationConfig: {
                temperature: 0.0, // Absolute zero
                topP: 0.1,
                topK: 10,
                // CRITICAL: Disable "Thinking" to prevent conversational bloat
                thinkingConfig: { include_thoughts: false }
            }
        };

        try {
            Logger.log(`[A.R.I.A] Generating Video Script with Model: ${preferredModel}...`);
            const response = await this.callGemini(apiKey, preferredModel, payload);

            // Extract text
            const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;

            // FULL RAW LOGGING FOR USER DEBUGGING
            if (text) {
                Logger.log(`[A.R.I.A] --- RAW MODEL OUTPUT START ---`);
                Logger.log(text);
                Logger.log(`[A.R.I.A] --- RAW MODEL OUTPUT END ---`);
            } else {
                Logger.log("[A.R.I.A] Video Gen: No text in response candidates.");
                return null;
            }

            // STRATEGY: Robust Regex Search (HTML or SVG)
            // Finds the first <!DOCTYPE html> ... </html> OR <svg ... </svg>
            const codeRegex = /(?:<!DOCTYPE\s+html>|<html[\s>])[\s\S]*?<\/html>|<svg[\s\S]*?<\/svg>/i;
            const match = text.match(codeRegex);

            if (match) {
                Logger.log("[A.R.I.A] Video Gen: Found Code block via Regex. Extracting...");
                return match[0].trim();
            }

            // Fallback: Markdown Code Block
            const codeBlockRegex = /```(?:html|xml|svg)?\s*([\s\S]*?)\s*```/i;
            const codeMatch = codeBlockRegex.exec(text);
            if (codeMatch && codeMatch[1]) {
                const inner = codeMatch[1].trim();
                // Simple heuristic check
                if (inner.startsWith('<') || inner.includes('xmlns')) {
                    Logger.log("[A.R.I.A] Video Gen: Found Markdown code block. Extracting...");
                    return inner;
                }
            }

            // Last Resort: Return text if it looks like it starts with a tag
            if (text.trim().startsWith('<')) {
                return text.trim();
            }

            Logger.log(`[A.R.I.A] Could not extract structured Code. See raw output above.`);
            return null;

        } catch (error) {
            Logger.log(`[A.R.I.A] Video Gen failed: ${error}`);
            throw error;
        }
    }

    public static async analyzeVideo(fileUri: string, mimeType: string, userPrompt: string): Promise<AnalysisOutput> {
        const config = vscode.workspace.getConfiguration('aria');
        const apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = "gemini-3-pro-preview";

        if (!apiKey) {
            return {
                summary: "Gemini API Key missing.",
                detectedIssues: ["Configuration Error"],
                recommendations: ["Set aria.apiKey"],
                confidence: 0
            };
        }

        const systemInstruction = "You are A.R.I.A, an AI assistant. You are analyzing a video provided by the user. " +
            "Answer the user's question based on the visual and audio evidence.\n" +
            "CRITICAL INSTRUCTION: First, determine if the video contains electronics, hardware, or code.\n" +
            "- If YES: Identify the board, wiring, and any issues.\n" +
            "- If NO: Simply describe what is happening in the video naturally (e.g., 'You are smiling at the camera'). DO NOT hallucinate hardware if none is visible.\n" +
            "Use Markdown for formatting. \n\n" +
            "IMPORTANT OUTPUT FORMAT:\n" +
            "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
            "2. Follow with a section header '# Final Summary' containing the direct answer to the user.\n" +
            "This structure is REQUIRED.";

        const payload = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: [{
                parts: [
                    { text: userPrompt || "Analyze this video for hardware issues." },
                    {
                        file_data: {
                            mime_type: mimeType,
                            file_uri: fileUri
                        }
                    }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                thinkingConfig: { include_thoughts: false }
            }
        };

        try {
            Logger.log(`[A.R.I.A] Analyzing Video with Model: ${preferredModel}...`);
            const response = await this.callGemini(apiKey.trim(), preferredModel, payload);
            return this.parseResponse(response);
        } catch (error) {
            Logger.log(`[A.R.I.A] Video analysis failed: ${error}`);
            throw error;
        }
    }

    public static async analyzeImage(base64Image: string, promptText: string): Promise<any> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;

        // Vision models: Try newer models first
        const visionModels = [
            "gemini-3-pro-preview",
            "gemini-3-flash-preview",
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite-001",
            "gemini-2.0-flash-001",
            "gemini-flash-latest"
        ];

        if (!apiKey) {
            Logger.log("[A.R.I.A] AI unavailable — running in dry mode");
            return {
                summary: "Vision Analysis (Dry Run)",
                detectedBoards: ["Unknown Board (Dry Run)"],
                detectedComponents: ["Unknown Component"],
                confidence: 0.0,
                disclaimers: ["Vision analysis requires a valid API Key."]
            };
        }

        apiKey = apiKey.trim();

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4 // Lower temperature for vision analysis too
            }
        };

        let lastError: Error | null = null;

        for (const model of visionModels) {
            try {
                Logger.log(`[A.R.I.A] Sending image to AI Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, payload);
                Logger.log(`[A.R.I.A] Vision analysis success with ${model}.`);
                return this.parseResponse(response);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] Vision analysis failed with ${model}: ${lastError.message}`);
                // Continue to next model
            }
        }

        // If all failed
        Logger.log(`[A.R.I.A] All vision models failed. Last error: ${lastError?.message}`);

        // Run diagnostic to help user debug
        await this.logAvailableModels(apiKey);

        throw lastError;
    }

    public static async chatWithImage(base64Image: string, userPrompt: string): Promise<AnalysisOutput> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = "gemini-3-pro-preview"; // Uses Pro for image analysis

        if (!apiKey) {
            return {
                summary: "Gemini API Key missing.",
                detectedIssues: ["Configuration Error"],
                recommendations: ["Set aria.apiKey"],
                confidence: 0
            };
        }
        apiKey = apiKey.trim();

        const systemInstruction = "You are A.R.I.A, a hardware-aware AI assistant. You are analyzing an image provided by the user along with their question. " +
            "Provide a helpful, technical response. If the user asks for code, provide it. If they ask for identification, provide it. " +
            "Use Markdown for formatting. \n\n" +
            "IMPORTANT OUTPUT FORMAT:\n" +
            "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
            "2. Follow with a section header '# Final Summary' containing the direct answer to the user.\n" +
            "3. If the user asks for code (or you generate code), you MUST provide a '# Suggestions' section with a single unified diff block (if editing) or a complete code block (if creating new).\n" +
            "   - If providing a full file, wrap it in a code block and ensure it is complete.\n" +
            "   - IMPORTANT: If rewriting a whole file or function, you MUST delete the old code using '-' lines in the diff. Do not just append new code. Replace it.\n" +
            "This structure is REQUIRED.";

        const payload = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: [{
                parts: [
                    { text: userPrompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4
            }
        };

        try {
            // User requested explicit "gemini-3-pro-image-preview" logging
            Logger.log(`[A.R.I.A] Chatting with Image using Model: gemini-3-pro-image-preview...`);
            const response = await this.callGemini(apiKey, preferredModel, payload);
            return this.parseResponse(response);
        } catch (error) {
            Logger.log(`[A.R.I.A] Chat with Image failed: ${error}`);
            // Fallback to flash if pro fails
            try {
                const fallback = "gemini-3-flash-preview";
                Logger.log(`[A.R.I.A] Retrying with ${fallback}...`);
                const response = await this.callGemini(apiKey, fallback, payload);
                return this.parseResponse(response);
            } catch (e) {
                throw new Error("Vision Chat failed: " + e);
            }
        }
    }

    public static async chat(userPrompt: string, context?: { code?: string, language?: string, filePath?: string, hardwareContext?: string }): Promise<AnalysisOutput> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get<string>('apiModel') || "gemini-3-flash-preview";

        if (!apiKey) {
            return {
                summary: "Gemini API Key missing.",
                detectedIssues: ["Configuration Error"],
                recommendations: ["Set aria.apiKey"],
                confidence: 0
            };
        }
        apiKey = apiKey.trim();

        const systemInstruction = "You are A.R.I.A, a hardware-aware AI assistant. " +
            "You are pair-programming with the user. " +
            "You are an expert in Bare Metal Firmware Debugging (ARM Cortex-M, ESP32, AVR) and PlatformIO Configuration. " +
            "\n\n**INTERACTION GUIDELINES:**\n" +
            "1. **Casual Chat:** If the user says 'hi', 'wassup', or asks a general question, respond conversationally. **DO NOT** analyze the active code or offer fixes unless explicitly asked.\n" +
            "2. **Code Help:** If the user asks about bugs, errors, or how to do something, use the provided context to give expert technical advice.\n" +
            "3. **Debugging:** If the user provides error codes or register dumps (e.g., HFSR, CFSR), DECODE them bit-by-bit and explain faults in detail.\n\n" +
            "Use Markdown for formatting. \n\n" +
            "CRITICAL: Always cross-reference detected boards/components with the code.\n" +
            "IMPORTANT OUTPUT FORMAT:\n" +
            "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
            "2. Follow with a section header '# Final Summary' containing the direct answer.\n" +
            "3. If providing code fixes, you MUST use the headers '--- <filename>' and '+++ <filename>'.\n" +
            "This structure is REQUIRED.";

        let contextText = "";
        if (context) {
            if (context.hardwareContext) {
                contextText += `HARDWARE CONTEXT:\n${context.hardwareContext}\n\n`;
            }
            if (context.code) {
                const lineCount = context.code.split('\n').length;
                contextText += `ACTIVE FILE (${context.filePath || 'untitled'} - ${lineCount} lines):\n\`\`\`${context.language || ''}\n${context.code}\n\`\`\`\n\n`;
            }
        }

        const payload = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: {
                parts: {
                    text: `${contextText}USER QUERY:\n${userPrompt}\n\n` +
                        `Answer the user's query. Use the context ONLY if relevant to the query (e.g. if the user asks about the code or errors). ` +
                        `Do not offer to fix the code if the user is just chatting.`
                }
            }
        };

        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                Logger.log(`[A.R.I.A] Chatting with Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, payload);
                return this.parseResponse(response);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] Chat failed with ${model}: ${lastError.message}`);
            }
        }

        throw lastError || new Error("All models failed");
    }

    public static async analyzeSerialLogs(logs: string[], hardwareContext: string): Promise<SerialAnalysisResult> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get<string>('apiModel') || "gemini-3-flash-preview";

        if (!apiKey) {
            return {
                suspectedIssues: ["Missing API Key"],
                likelyRootCauses: ["AI unavailable"],
                confidence: 0.0,
                suggestedFixes: []
            };
        }

        apiKey = apiKey.trim();

        const prompt = {
            system_instruction: {
                parts: {
                    text: "You are A.R.I.A, a hardware-aware debugging assistant. " +
                        "You are an expert in Bare Metal Firmware Debugging. " +
                        "Analyze Serial Logs for crash dumps, stack traces, and fault registers (HardFault, BusFault, etc.). " +
                        "If you see register values (e.g. 0x00020000), explain what the bits mean. " +
                        "Use Markdown for formatting. \n\n" +
                        "IMPORTANT OUTPUT FORMAT:\n" +
                        "1. Start with a section header '# Thinking Process' and explain your analysis.\n" +
                        "2. Follow with a section header '# Final Summary' containing the direct answer to the user.\n" +
                        "This structure is REQUIRED."
                }
            },
            contents: {
                parts: {
                    text: `Analyze these serial logs from an embedded device:\n` +
                        `HARDWARE CONTEXT: ${hardwareContext}\n` +
                        `LOGS:\n${logs.join('\n')}\n\n` +
                        `Output the result in plain text with a clear "Thinking Process" section followed by the final "Summary" and "Recommendations". Use markdown code blocks for diffs.\n\n` +
                        `EXAMPLE OUTPUT FORMAT:\n` +
                        `# Thinking Process\n[Analysis details...]\n\n# Final Summary\n[Summary of issue]\n\n# Recommendations\n- [Recommendation 1]\n- [Recommendation 2]\n\n# Suggestions\n\`\`\`diff\n--- src/main.cpp\n+++ src/main.cpp\n@@ -1,1 +1,1 @@\n-old line\n+new line\n\`\`\``
                }
            }
        };

        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                Logger.log(`[A.R.I.A] Analyzing logs with Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                return this.parseSerialResponse(response);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.log(`[A.R.I.A] Serial analysis failed with ${model}: ${lastError.message}`);
            }
        }

        throw lastError || new Error("All models failed");
    }

    private static parseSerialResponse(data: any): SerialAnalysisResult {
        try {
            // DEBUG: Log the full response structure to help debug Gemini 3 output
            if (data?.candidates?.[0]?.content) {
                Logger.log(`[A.R.I.A] DEBUG: Received Serial Response Structure: ${JSON.stringify(data.candidates[0].content, null, 2)}`);
            }

            const parts = data?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts)
                ? parts.map((p: any) => p?.text).filter((t: string) => t && t.trim().length > 0).join("\n\n")
                : data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Empty response from AI");

            // Parse Markdown to restore structure
            const structured = this.parseMarkdownResponse(text);

            return {
                suspectedIssues: structured.detectedIssues || [],
                likelyRootCauses: structured.summary ? [structured.summary] : [], // Use summary as root cause if needed
                confidence: 1.0,
                suggestedFixes: structured.suggestions ? structured.suggestions.map(s => ({
                    description: s.description,
                    diff: s.diff
                })) : [],
                thoughtProcess: structured.thoughtProcess // Only the extracted thinking process
            };
        } catch (e) {
            Logger.log("[A.R.I.A] Failed to parse AI Serial response: " + e);
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) Logger.log(`[A.R.I.A] Raw Output (Full):\n${rawText}`);
            throw e;
        }
    }

    private static parseMarkdownResponse(text: string): {
        summary?: string,
        detectedIssues?: string[],
        recommendations?: string[],
        suggestions?: { description: string, diff: string }[],
        thoughtProcess?: string
    } {
        const result: any = {
            detectedIssues: [],
            recommendations: [],
            suggestions: [],
            thoughtProcess: undefined
        };

        const thinkingMatch = text.match(/#{1,6}\s*(Thinking\s+Process|Thinking)\s*([\s\S]*?)(?=#{1,6}\s*(Final\s+Summary|Summary|Recommendations|Suggestions)|$)/i);
        if (thinkingMatch) {
            result.thoughtProcess = thinkingMatch[2].trim();
        }

        const summaryMatch = text.match(/#{1,6}\s*(Final\s+Summary|Summary)\s*([\s\S]*?)(?=#{1,6}\s*(Recommendations|Suggestions|Thinking|Final\s+Summary|Summary)|$)/i);
        if (summaryMatch) {
            result.summary = summaryMatch[2].trim();
        }

        const recommendationsMatch = text.match(/#{1,6}\s*Recommendations\s*([\s\S]*?)(?=#{1,6}\s*(Suggestions|Summary|Final\s+Summary|Thinking)|$)/i);
        if (recommendationsMatch) {
            const content = recommendationsMatch[1];
            const bulletMatches = Array.from(content.matchAll(/^[\s>*-]*[-*•]\s+(.+)$/gm)).map(m => m[1].trim());
            const normalized = bulletMatches.length > 0
                ? bulletMatches
                : content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            result.recommendations = normalized.map(l => l.replace(/\*\*(.*?)\*\*/g, '$1').trim());
            result.detectedIssues = result.recommendations;
        }

        const suggestionsMatch = text.match(/#{1,6}\s*Suggestions\s*([\s\S]*?)(?=#{1,6}\s*(Summary|Final\s+Summary|Recommendations|Thinking)|$)/i);
        const suggestionsRange = suggestionsMatch ? { start: suggestionsMatch.index!, end: suggestionsMatch.index! + suggestionsMatch[0].length } : null;

        const suggestionsRegex = /```(?:\w+)?\s*([\s\S]*?)\s*```/g;
        let match;
        while ((match = suggestionsRegex.exec(text)) !== null) {
            const content = match[1].trim();
            const blockStart = match.index;

            // Check if this block looks like a Unified Diff
            const hasDiffHeaders = /^--- [^\n]+\n\+\+\+ [^\n]+/m.test(content);
            const hasHunks = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/m.test(content);

            const isDiff = hasDiffHeaders || hasHunks;
            const isInSuggestions = suggestionsRange && blockStart >= suggestionsRange.start && blockStart < suggestionsRange.end;

            if (isDiff) {
                const diff = content;
                // Try to extract file path from diff header
                const fileMatch = diff.match(/^---\s+(?:a\/)?([^\s]+)/m);
                const filePath = fileMatch ? fileMatch[1] : undefined;

                const precedingText = text.substring(0, match.index).trim().split('\n').pop() || "Code Fix";
                result.suggestions.push({
                    description: precedingText.replace(/^[\-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').trim(),
                    diff: diff,
                    filePath: filePath
                });
            } else if (isInSuggestions) {
                // It's a code block inside # Suggestions, but NOT a diff.
                // Treat it as a Full File Rewrite (Option B).
                // Filter out small snippets or non-code
                if (content.length > 50 && !/Thinking Process|Summary/i.test(content)) {
                    result.suggestions.push({
                        description: "Full File Rewrite (Manual Apply)",
                        diff: content, // ariaPanel will treat non-diff as full rewrite
                        filePath: undefined // Will rely on active editor or fallback
                    });
                }
            }
        }

        if (result.suggestions.length === 0) {
            const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)\s*```/g;
            const codeBlocks: { content: string; index: number; lang: string }[] = [];
            let codeMatch;
            while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
                const content = codeMatch[1].trim();
                const block = codeMatch[0];
                const langMatch = block.match(/```(\w+)?/);
                const lang = (langMatch?.[1] || "").toLowerCase();
                codeBlocks.push({ content, index: codeMatch.index, lang });
            }

            const correctedIndex = text.search(/#+\s*Corrected Code|Corrected Code/i);
            const isLikelyCode = (content: string) => {
                if (content.length < 20) return false; // Too short
                if (content.includes('```')) return false; // Nested blocks

                // Reject pure Markdown/Prose blocks
                if (/^###\s+/.test(content)) return false; // Markdown Headers
                if (/Thinking Process|Summary|Recommendations/i.test(content)) return false;

                // If it looks like a diff, it's good
                if (content.startsWith('---') || content.startsWith('+++') || content.startsWith('@@')) return true;

                // If it contains C++ structured elements, it's good
                if (/#include\s+<|void\s+setup\s*\(|int\s+main\s*\(|class\s+\w+|#if\s+defined/i.test(content)) return true;

                // Reject if it has too many markdown list items relative to code lines
                const lines = content.split('\n');
                const listItems = lines.filter(l => l.trim().startsWith('- ') || l.trim().match(/^\d+\./)).length;
                if (listItems > lines.length / 2) return false;

                return /[;{}]/.test(content);
            };

            let selected: string | null = null;
            if (correctedIndex >= 0) {
                const after = codeBlocks.find(b => b.index > correctedIndex && isLikelyCode(b.content));
                if (after) {
                    selected = after.content;
                }
            }

            if (!selected && codeBlocks.length > 0) {
                let bestScore = -1;
                for (const block of codeBlocks) {
                    if (!isLikelyCode(block.content)) continue;
                    let score = block.content.length;
                    if (/#include\s+</.test(block.content)) score += 5000;
                    if (/void\s+setup\s*\(/.test(block.content)) score += 5000;
                    if (/int\s+main\s*\(/.test(block.content)) score += 3000;
                    if (block.lang && block.lang !== 'json' && block.lang !== 'diff' && block.lang !== 'bash') score += 500;
                    if (score > bestScore) {
                        bestScore = score;
                        selected = block.content;
                    }
                }
            }

            if (selected) {
                // Formatting Fix: Sometimes AI puts "### Option B" inside the code block. 
                // We strip lines that look like Markdown headers or non-code explanation at the start.
                const lines = selected.split('\n');
                const cleanLines: string[] = [];
                let inCode = false;

                for (const line of lines) {
                    // Skip markdown headers or bold text at the start if we haven't seen code yet
                    if (!inCode) {
                        if (/^#{1,6}\s/.test(line)) continue; // Header
                        if (/^\*\*.+\*\*$/.test(line)) continue; // Bold Title
                        if (/^This implementation/.test(line)) continue; // Common conversational start

                        // Detect start of actual code
                        if (line.trim().startsWith('#') || // Preprocessor
                            line.trim().startsWith('//') || // Comment
                            line.trim().includes(';') ||
                            line.trim().includes('{') ||
                            line.trim().startsWith('using') ||
                            line.trim().startsWith('class') ||
                            line.trim().startsWith('void') ||
                            line.trim().startsWith('int') ||
                            line.trim().startsWith('---') || // Diff
                            line.trim().length === 0) { // Allow empty lead lines
                            inCode = true;
                        } else {
                            // potential garbage line
                            continue;
                        }
                    }
                    cleanLines.push(line);
                }

                result.suggestions.push({
                    description: "Full File Rewrite (All Fixes Applied)",
                    diff: cleanLines.join('\n').trim()
                });
            }
        }

        return result;
    }

    private static extractJson<T>(text: string, schemaCheck?: (obj: any) => boolean): T {
        return this.extractJsonAndThoughts<T>(text, schemaCheck).result;
    }

    private static extractJsonAndThoughts<T>(text: string, schemaCheck?: (obj: any) => boolean): { result: T, thoughts?: string } {
        Logger.log(`[A.R.I.A] Starting JSON extraction from text of length: ${text.length}`);

        // Strategy 1: Look for explicit JSON code blocks (most reliable)
        const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const jsonCodeBlock = text.match(jsonCodeBlockRegex);
        if (jsonCodeBlock) {
            try {
                const jsonContent = jsonCodeBlock[1].trim();
                Logger.log(`[A.R.I.A] Found JSON code block, attempting to parse: ${jsonContent.substring(0, 100)}...`);
                const obj = JSON.parse(jsonContent);
                if (!schemaCheck || schemaCheck(obj)) {
                    const thoughts = text.substring(0, jsonCodeBlock.index).trim();
                    Logger.log(`[A.R.I.A] Successfully parsed JSON from code block. Thoughts length: ${thoughts.length}`);
                    return { result: obj, thoughts };
                }
                Logger.log(`[A.R.I.A] JSON from code block failed schema check`);
            } catch (e) {
                Logger.log(`[A.R.I.A] Failed to parse JSON from code block: ${(e as any).message}`);
            }
        }

        // Strategy 2: Look for generic code blocks that might contain JSON
        const genericCodeBlockRegex = /```\s*([\s\S]*?)\s*```/g;
        let genericCodeBlock;
        while ((genericCodeBlock = genericCodeBlockRegex.exec(text)) !== null) {
            try {
                const content = genericCodeBlock[1].trim();
                // Try to parse as JSON
                const obj = JSON.parse(content);
                if (!schemaCheck || schemaCheck(obj)) {
                    const thoughts = text.substring(0, genericCodeBlock.index).trim();
                    Logger.log(`[A.R.I.A] Successfully parsed JSON from generic code block. Thoughts length: ${thoughts.length}`);
                    return { result: obj, thoughts };
                }
            } catch (e) {
                // Continue to next code block
            }
        }

        // Strategy 3: Find the most complete JSON structure using balanced braces
        Logger.log(`[A.R.I.A] Attempting balanced brace approach`);
        const balancedResult = this.findBalancedJson<T>(text, schemaCheck);
        if (balancedResult) {
            Logger.log(`[A.R.I.A] Successfully found balanced JSON. Thoughts length: ${balancedResult.thoughts?.length || 0}`);
            return balancedResult;
        }

        // Strategy 4: Aggressive cleanup - remove all non-JSON content
        Logger.log(`[A.R.I.A] Attempting aggressive cleanup approach`);
        try {
            // Remove markdown, thinking text, and other artifacts
            let cleanedText = text
                .replace(/```json\s*/g, '')
                .replace(/\s*```/g, '')
                .replace(/\*\*.*\*\*/g, '') // Remove bold markdown
                .replace(/\*.*\*/g, '') // Remove italic markdown
                .replace(/^#.*$/gm, '') // Remove headers
                .replace(/^>.*$/gm, '') // Remove quotes
                .trim();

            // Find JSON-like patterns
            const jsonPattern = /\{[\s\S]*\}/;
            const jsonMatch = cleanedText.match(jsonPattern);
            if (jsonMatch) {
                let jsonString = jsonMatch[0];

                // Fix common AI JSON errors
                // 1. Fix unnecessary escaping of single quotes (invalid in standard JSON)
                jsonString = jsonString.replace(/\\'/g, "'");

                const obj = JSON.parse(jsonString);
                if (!schemaCheck || schemaCheck(obj)) {
                    // Extract thoughts as everything before the JSON
                    const jsonStartIndex = text.indexOf(jsonMatch[0]); // Note: this might be inexact if we cleaned too much, but it's a fallback
                    const thoughts = text.substring(0, jsonStartIndex > 0 ? jsonStartIndex : 0).trim();
                    Logger.log(`[A.R.I.A] Successfully parsed JSON from aggressive cleanup. Thoughts length: ${thoughts.length}`);
                    return { result: obj, thoughts };
                }
            }
        } catch (e) {
            Logger.log(`[A.R.I.A] Aggressive cleanup failed: ${(e as any).message}`);
        }

        throw new Error("No valid JSON found in response after all extraction strategies");
    }

    private static findBalancedJson<T>(text: string, schemaCheck?: (obj: any) => boolean): { result: T, thoughts?: string } | null {
        let braceCount = 0;
        let jsonStart = -1;
        let jsonEnd = -1;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (braceCount === 0) {
                    jsonStart = i;
                }
                braceCount++;
            } else if (text[i] === '}') {
                braceCount--;
                if (braceCount === 0 && jsonStart !== -1) {
                    jsonEnd = i + 1;

                    try {
                        const potentialJson = text.substring(jsonStart, jsonEnd);
                        const obj = JSON.parse(potentialJson);

                        if (!schemaCheck || schemaCheck(obj)) {
                            const thoughts = text.substring(0, jsonStart).trim();
                            return { result: obj, thoughts };
                        }
                    } catch (e) {
                        // Continue searching
                    }
                }
            }
        }

        return null;
    }

    private static async callGemini(apiKey: string, model: string, payload: any, retries = 1): Promise<any> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

        // Handle API Version: Use v1alpha for Gemini 3, v1beta for others
        const isGemini3 = model.includes("gemini-3");
        const apiVersion = isGemini3 ? "v1alpha" : "v1beta";
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

        // Clone payload to safely modify for specific models
        let finalPayload = JSON.parse(JSON.stringify(payload));

        if (isGemini3) {
            // Add Generation Config if missing
            if (!finalPayload.generationConfig) {
                finalPayload.generationConfig = {};
            }

            // STRICT MODE: Enforce 0.4 for code diffs/thinking, BUT respect explicit overrides
            // (e.g. Video Generation uses 0.1, Creative Writing might use 0.9)
            if (finalPayload.generationConfig.temperature === undefined) {
                finalPayload.generationConfig.temperature = 0.4;
                Logger.log(`[A.R.I.A] Enforcing Strict Mode (Temp=0.4) for Gemini 3 model: ${model}`);
            } else {
                Logger.log(`[A.R.I.A] Using Custom Temperature (${finalPayload.generationConfig.temperature}) for Gemini 3 model: ${model}`);
            }

            // Note: We are using default "High" thinking level for Pro/Flash.
            // Explicitly enabling thinking to ensure deep reasoning
            // ONLY if not explicitly disabled or set
            if (finalPayload.generationConfig?.responseMimeType === "application/json") {
                finalPayload.generationConfig.thinkingConfig = { include_thoughts: false };
            } else {
                if (!finalPayload.generationConfig.thinkingConfig) {
                    finalPayload.generationConfig.thinkingConfig = { include_thoughts: true };
                }
            }

            // Increase output tokens for Thinking models to prevent JSON truncation
            finalPayload.generationConfig.maxOutputTokens = 65536;

            // Vision: Add media_resolution if image is present
            if (finalPayload.contents?.[0]?.parts) {
                finalPayload.contents[0].parts = finalPayload.contents[0].parts.map((p: any) => {
                    if (p.inline_data) {
                        return {
                            ...p,
                            media_resolution: { level: "media_resolution_high" }
                        };
                    }
                    return p;
                });
            }
        }

        const body = JSON.stringify(finalPayload);

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
                return this.callGemini(apiKey, model, payload, retries - 1);
            }

            if (response.status === 503 && retries > 0) {
                const backoff = 2000 * (3 - retries + 1); // 2s, 4s, 6s...
                Logger.log(`[A.R.I.A] Server Overloaded (503) for ${model}. Backing off for ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                clearTimeout(id);
                return this.callGemini(apiKey, model, payload, retries - 1);
            }

            if (!response.ok) {
                const errorText = await response.text();
                let cleanMsg = errorText;
                try {
                    const errObj = JSON.parse(errorText);
                    if (errObj.error && errObj.error.message) {
                        cleanMsg = errObj.error.message;
                    }
                } catch { }
                throw new Error(`API ${response.status} - ${cleanMsg}`);
            }

            return await response.json();
        } finally {
            clearTimeout(id);
        }
    }

    private static parseResponse(data: any): AnalysisOutput {
        try {
            // DEBUG: Log the full response structure
            if (data?.candidates?.[0]?.content) {
                Logger.log(`[A.R.I.A] DEBUG: Received Response Structure: ${JSON.stringify(data.candidates[0].content, null, 2)}`);
            }

            const parts = data?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts)
                ? parts.map((p: any) => p?.text).filter((t: string) => t && t.trim().length > 0).join("\n\n")
                : data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No valid text found in response");

            // Parse Markdown to restore structure
            const structured = this.parseMarkdownResponse(text);

            return {
                summary: structured.summary || "Analysis Completed",
                detectedIssues: structured.detectedIssues || [],
                recommendations: structured.recommendations || [],
                confidence: 1.0,
                thoughtProcess: structured.thoughtProcess, // Only the extracted thinking process
                suggestions: structured.suggestions
            } as any;
        } catch (e) {
            Logger.log("[A.R.I.A] Failed to parse AI response: " + e);
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) Logger.log(`[A.R.I.A] Raw Output (Full):\n${rawText}`);
            throw e;
        }
    }

    public static async listAvailableModels(apiKey?: string): Promise<string[]> {
        const config = vscode.workspace.getConfiguration('aria');
        let key = apiKey || config.get<string>('apiKey') || process.env.GEMINI_API_KEY;
        if (!key) return [];
        key = key.trim();
        const response = await fetch(`${this.BASE_URL}?key=${key}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Model list failed: ${response.status} - ${text}`);
        }
        const data: any = await response.json();
        const models = Array.isArray(data.models) ? data.models : [];
        Logger.log(`[A.R.I.A] Available Models: ${models.map((m: any) => m.name).join(', ')}`);
        return models
            .map((m: any) => (m.name || '').replace('models/', ''))
            .filter((name: string) => name.startsWith('gemini'));
    }

    private static mockAnalysis(input: AnalysisInput): AnalysisOutput {
        return {
            summary: "AI Analysis (Dry Run)",
            detectedIssues: ["API Key missing", "Analysis simulated"],
            recommendations: ["Set GEMINI_API_KEY environment variable", "Check internet connection"],
            confidence: 0.0
        };
    }

    public static async generateImage(prompt: string): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("Gemini API Key missing.");
        }
        apiKey = apiKey.trim();

        // Imagen 4 Endpoint (Found in user logs)
        const model = "imagen-4.0-fast-generate-001";
        const url = `${this.BASE_URL}/${model}:predict?key=${apiKey}`;

        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9" // Good for schematics
            }
        };

        try {
            Logger.log(`[A.R.I.A] Generating image with ${model}... Prompt: ${prompt.substring(0, 50)}...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Image generation failed: ${response.status} - ${errText}`);
            }

            const data: any = await response.json();
            // Response format: { predictions: [ { bytesBase64Encoded: "..." } ] }
            if (data.predictions && data.predictions.length > 0) {
                return data.predictions[0].bytesBase64Encoded;
            } else {
                return null;
            }
        } catch (e) {
            Logger.log(`[A.R.I.A] Image Gen Error: ${e}`);
            throw e;
        }
    }

    public static async generateSchematicSVG(prompt: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get<string>('apiKey') || process.env.GEMINI_API_KEY;

        // User requested specifically "gemini-3-pro-image-preview" for the hackathon
        const model = "gemini-3-pro-image-preview";

        if (!apiKey) throw new Error("Gemini API Key missing.");

        const url = `${this.BASE_URL}/${model}:generateContent?key=${apiKey}`;

        const systemPrompt = `You are an expert Electronics Design Engineer.
        Generate a high-fidelity, professional schematic for the user's request.
        
        Preferred Output: A generated IMAGE (if supported).
        Fallback Output: Precision SVG code (if image generation is not available).
        
        SVG Style Guide (if generating SVG):
        - Background: White.
        - Lines: Black, 2px stroke.
        - Style: Technical, CAD-like, IEEE symbols.
        - Layout: Align components to grid, no overlapping labels.
        
        Request: ${prompt}`;

        const payload = {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
                temperature: 0.2, // Reverting to low temp for precision
                maxOutputTokens: 8192
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
            }

            const data: any = await response.json();
            Logger.log(`[A.R.I.A] Raw Gemini Response: ${JSON.stringify(data).substring(0, 500)}...`);
            const candidate = data.candidates?.[0]?.content?.parts?.[0];

            // 1. Check for Native Image (inlineData) - Gemini uses camelCase
            if (candidate?.inlineData && candidate?.inlineData?.data) {
                // Return formatted as base64 string
                Logger.log('[A.R.I.A] Native Image generation successful (inlineData detected)');
                return `data:${candidate.inlineData.mimeType};base64,${candidate.inlineData.data}`;
            }

            // 2. Check for Text (SVG)
            let text = candidate?.text || "";

            // Clean up code blocks
            text = text.replace(/```svg/g, '').replace(/```xml/g, '').replace(/```/g, '').trim();

            if (text.includes('<svg')) {
                return text;
            }

            // 3. Fallback/Error
            if (!text && !candidate) {
                throw new Error("No image or SVG generated.");
            }

            return text; // Return text processing instruction or error message as text

        } catch (e) {
            Logger.log(`[A.R.I.A] SVG Gen Error: ${e}`);
            throw e;
        }
    }
}
