"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
class GeminiClient {
    static async analyzeCode(input) {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get('apiModel') || "gemini-3-flash-preview";
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
                `- Detected Components: ${input.visionContext.components.join(', ')}\n` +
                `- Confidence: ${input.visionContext.confidence}\n\n`;
        }
        const codeLabel = input.source === 'selection' ? "SELECTED CODE" : "FILE CONTENT";
        // Make the task description more explicit about hardware
        const isFullFileAnalysis = input.source === 'file';
        const taskDescription = input.taskDescription || "Analyze this code for bugs, hardware compatibility issues, and improvements.";
        const systemInstruction = isFullFileAnalysis
            ? "You are a hardware-aware code analysis engine (A.R.I.A). You understand embedded systems (PlatformIO, Arduino, ESP32, Teensy). Your goal is to provide a COMPLETE, CORRECTED version of the user's file that fixes ALL issues."
            : "You are a hardware-aware code analysis engine (A.R.I.A). You understand embedded systems (PlatformIO, Arduino, ESP32, Teensy). Follow this process strictly:\n1. THINKING PROCESS: Analyze the code/issue in detail.\n2. FINAL SUMMARY: Provide a concise summary and a unified diff.";
        const outputFormat = isFullFileAnalysis
            ? `\nOutput the result in plain text with:\n` +
                `1. "Thinking Process": Analyze the issues.\n` +
                `2. "Summary": Brief summary of changes.\n` +
                `3. "Corrected Code": The COMPLETE, FULLY CORRECTED file content inside a code block (e.g., \`\`\`cpp ... \`\`\`).\n` +
                `   - DO NOT use diffs.\n` +
                `   - DO NOT return partial code.\n` +
                `   - Return the ENTIRE file from start to finish, with all fixes applied.\n` +
                `   - Ensure all syntax (braces, semicolons) is correct.\n` +
                `   - Use exactly ONE code block for the corrected code.\n` +
                `   - Do NOT put analysis, summaries, or other text inside any code block.\n`
            : `\nOutput the result in plain text with a clear "Thinking Process" section followed by the final "Summary" and "Recommendations". Use markdown code blocks for diffs.\n` +
                `If proposing changes, provide ONE unified diff that fixes ALL issues found. Do not output partial or incomplete lines.\n`;
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
                        `# Thinking Process\n[Analysis...]\n\n# Summary\n[Summary...]\n\n# Corrected Code\n\`\`\`${input.language}\n[FULL CODE HERE]\n\`\`\``
                }
            }
        };
        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError = null;
        for (const model of modelsToTry) {
            try {
                logger_1.Logger.log(`[A.R.I.A] Trying AI Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                return this.parseResponse(response);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.Logger.log(`[A.R.I.A] Model ${model} failed: ${lastError.message}`);
            }
        }
        throw lastError || new Error("All models failed");
    }
    static async analyzeProject(files, hardwareContext, visionContext) {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get('apiModel') || "gemini-3-flash-preview";
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
                parts: { text: "You are A.R.I.A, a hardware-aware code analysis engine. Analyze the entire project context. Find cross-file issues, logical errors, and hardware mismatches. Provide a ROOT SOLUTION, not a patch." }
            },
            contents: {
                parts: {
                    text: `Analyze this project:\n` +
                        `HARDWARE CONTEXT: ${hardwareContext}\n${visionSection}\n` +
                        `PROJECT FILES:\n${fileContentStr}\n\n` +
                        `Task:\n` +
                        `1. Identify issues spanning multiple files or within specific files.\n` +
                        `2. Provide a single 'Thinking Process'.\n` +
                        `3. Provide a 'Summary' of issues.\n` +
                        `4. Provide 'Recommendations'.\n` +
                        `5. Provide 'Suggestions' using STRICT UNIFIED DIFFS for each file that needs changes.\n` +
                        `   - IMPORTANT: Each diff MUST start with '--- <filepath>' and '+++ <filepath>' so we know which file to apply it to.\n` +
                        `   - Use relative paths matching the provided filenames (e.g. 'src/main.cpp').\n` +
                        `   - Provide ONE unified diff per file that fixes ALL issues in that file.\n` +
                        `   - Do NOT output partial or incomplete lines. Include at least 3 lines of context (unchanged lines) around changes.\n` +
                        `   - NEVER use placeholders like '...' or '// ...' in context lines. You must use the EXACT original code for context.\n` +
                        `   - Ensure valid unified diff syntax (lines start with ' ', '+', or '-').\n` +
                        `   - Treat each file with the same rigor as a single-file analysis. Do not skip details.\n` +
                        `   - If a file needs extensive changes, provide the diff for the ENTIRE affected section, ensuring no context is lost.\n` +
                        `\nEXAMPLE RESPONSE FORMAT:\n` +
                        `# Thinking Process\n[Analysis...]\n\n# Summary\n[Summary...]\n\n# Recommendations\n- [Rec 1]\n\n# Suggestions\n` +
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
        let lastError = null;
        let successfulModel = "";
        for (const model of modelsToTry) {
            try {
                logger_1.Logger.log(`[A.R.I.A] Analyzing Project with Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                successfulModel = model;
                const result = this.parseResponse(response);
                // @ts-ignore - Inject model name into result metadata if needed later, 
                // but mostly we rely on the caller to know which model was requested or 
                // we can return it. For now, let's just return the result.
                // We'll attach the model name in the analyzeWorkspace command.
                result.usedModel = successfulModel;
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.Logger.log(`[A.R.I.A] Project analysis failed with ${model}: ${lastError.message}`);
            }
        }
        throw lastError || new Error("All models failed");
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
                parts: { text: "You are a hardware-aware code analysis engine (A.R.I.A). You understand embedded systems (PlatformIO, Arduino, ESP32, Teensy). Follow this process strictly:\n1. THINKING PROCESS: Analyze the code/issue in detail. Explain your reasoning, check hardware context, and verify assumptions.\n2. FINAL SUMMARY: Provide a concise summary of the issue and the fix. Use markdown code blocks for diffs." }
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
                        `# Thinking Process\n[Analysis details...]\n\n# Summary\n[Summary of issue]\n\n# Recommendations\n- [Recommendation 1]\n- [Recommendation 2]\n\n# Suggestions\n\`\`\`diff\n--- src/main.cpp\n+++ src/main.cpp\n@@ -1,1 +1,1 @@\n-old line\n+new line\n\`\`\``
                }
            }
        };
    }
    static async analyzeImage(base64Image, promptText) {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get('apiKey') || process.env.GEMINI_API_KEY;
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
            logger_1.Logger.log("[A.R.I.A] AI unavailable — running in dry mode");
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
                }]
        };
        let lastError = null;
        for (const model of visionModels) {
            try {
                logger_1.Logger.log(`[A.R.I.A] Sending image to AI Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, payload);
                logger_1.Logger.log(`[A.R.I.A] Vision analysis success with ${model}.`);
                return this.parseResponse(response);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.Logger.log(`[A.R.I.A] Vision analysis failed with ${model}: ${lastError.message}`);
                // Continue to next model
            }
        }
        // If all failed
        logger_1.Logger.log(`[A.R.I.A] All vision models failed. Last error: ${lastError?.message}`);
        // Run diagnostic to help user debug
        await this.logAvailableModels(apiKey);
        throw lastError;
    }
    static async analyzeSerialLogs(logs, hardwareContext) {
        const config = vscode.workspace.getConfiguration('aria');
        let apiKey = config.get('apiKey') || process.env.GEMINI_API_KEY;
        const preferredModel = config.get('apiModel') || "gemini-3-flash-preview";
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
                parts: { text: "You are A.R.I.A, a hardware-aware debugging assistant. Follow this process strictly:\n1. THINKING PROCESS: Analyze the serial logs conservatively. Explain your reasoning. Do not assume hardware failure unless explicitly indicated.\n2. FINAL SUMMARY: Provide a concise summary of the issue and the fix. Use markdown code blocks for diffs." }
            },
            contents: {
                parts: {
                    text: `Analyze these serial logs from an embedded device:\n` +
                        `HARDWARE CONTEXT: ${hardwareContext}\n` +
                        `LOGS:\n${logs.join('\n')}\n\n` +
                        `Output the result in plain text with a clear "Thinking Process" section followed by the final "Summary" and "Recommendations". Use markdown code blocks for diffs.\n\n` +
                        `EXAMPLE OUTPUT FORMAT:\n` +
                        `# Thinking Process\n[Analysis details...]\n\n# Summary\n[Summary of issue]\n\n# Recommendations\n- [Recommendation 1]\n- [Recommendation 2]\n\n# Suggestions\n\`\`\`diff\n--- src/main.cpp\n+++ src/main.cpp\n@@ -1,1 +1,1 @@\n-old line\n+new line\n\`\`\``
                }
            }
        };
        const modelsToTry = [preferredModel, ...this.FALLBACK_MODELS.filter(m => m !== preferredModel)];
        let lastError = null;
        for (const model of modelsToTry) {
            try {
                logger_1.Logger.log(`[A.R.I.A] Analyzing logs with Model: ${model}...`);
                const response = await this.callGemini(apiKey, model, prompt);
                return this.parseSerialResponse(response);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.Logger.log(`[A.R.I.A] Serial analysis failed with ${model}: ${lastError.message}`);
            }
        }
        throw lastError || new Error("All models failed");
    }
    static parseSerialResponse(data) {
        try {
            // DEBUG: Log the full response structure to help debug Gemini 3 output
            if (data?.candidates?.[0]?.content) {
                logger_1.Logger.log(`[A.R.I.A] DEBUG: Received Serial Response Structure: ${JSON.stringify(data.candidates[0].content, null, 2)}`);
            }
            const parts = data?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts)
                ? parts.map((p) => p?.text).filter((t) => t && t.trim().length > 0).join("\n\n")
                : data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text)
                throw new Error("Empty response from AI");
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
                thoughtProcess: text
            };
        }
        catch (e) {
            logger_1.Logger.log("[A.R.I.A] Failed to parse AI Serial response: " + e);
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText)
                logger_1.Logger.log(`[A.R.I.A] Raw Output (Full):\n${rawText}`);
            throw e;
        }
    }
    static parseMarkdownResponse(text) {
        const result = {
            detectedIssues: [],
            recommendations: [],
            suggestions: []
        };
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
        const suggestionsRegex = /```(?:\w+)?\s*([\s\S]*?)\s*```/g;
        let match;
        while ((match = suggestionsRegex.exec(text)) !== null) {
            const content = match[1].trim();
            // Check if this block looks like a Unified Diff
            const hasDiffHeaders = /^--- [^\n]+\n\+\+\+ [^\n]+/m.test(content);
            const hasHunks = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/m.test(content);
            if (hasDiffHeaders || hasHunks) {
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
            }
        }
        if (result.suggestions.length === 0) {
            const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)\s*```/g;
            const codeBlocks = [];
            let codeMatch;
            while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
                const content = codeMatch[1].trim();
                const block = codeMatch[0];
                const langMatch = block.match(/```(\w+)?/);
                const lang = (langMatch?.[1] || "").toLowerCase();
                codeBlocks.push({ content, index: codeMatch.index, lang });
            }
            const correctedIndex = text.search(/#+\s*Corrected Code|Corrected Code/i);
            const isLikelyCode = (content) => {
                if (content.length < 50)
                    return false;
                if (content.includes('```'))
                    return false;
                if (/Thinking Process|Summary|Recommendations/i.test(content))
                    return false;
                if (content.startsWith('---') || content.startsWith('+++'))
                    return false;
                if (/#include\s+<|void\s+setup\s*\(|int\s+main\s*\(|class\s+\w+|#if\s+defined/i.test(content))
                    return true;
                return /[;{}]/.test(content);
            };
            let selected = null;
            if (correctedIndex >= 0) {
                const after = codeBlocks.find(b => b.index > correctedIndex && isLikelyCode(b.content));
                if (after) {
                    selected = after.content;
                }
            }
            if (!selected && codeBlocks.length > 0) {
                let bestScore = -1;
                for (const block of codeBlocks) {
                    if (!isLikelyCode(block.content))
                        continue;
                    let score = block.content.length;
                    if (/#include\s+</.test(block.content))
                        score += 5000;
                    if (/void\s+setup\s*\(/.test(block.content))
                        score += 5000;
                    if (/int\s+main\s*\(/.test(block.content))
                        score += 3000;
                    if (block.lang && block.lang !== 'json' && block.lang !== 'diff' && block.lang !== 'bash')
                        score += 500;
                    if (score > bestScore) {
                        bestScore = score;
                        selected = block.content;
                    }
                }
            }
            if (selected) {
                result.suggestions.push({
                    description: "Full File Rewrite (All Fixes Applied)",
                    diff: selected
                });
            }
        }
        return result;
    }
    static extractJson(text, schemaCheck) {
        return this.extractJsonAndThoughts(text, schemaCheck).result;
    }
    static extractJsonAndThoughts(text, schemaCheck) {
        logger_1.Logger.log(`[A.R.I.A] Starting JSON extraction from text of length: ${text.length}`);
        // Strategy 1: Look for explicit JSON code blocks (most reliable)
        const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const jsonCodeBlock = text.match(jsonCodeBlockRegex);
        if (jsonCodeBlock) {
            try {
                const jsonContent = jsonCodeBlock[1].trim();
                logger_1.Logger.log(`[A.R.I.A] Found JSON code block, attempting to parse: ${jsonContent.substring(0, 100)}...`);
                const obj = JSON.parse(jsonContent);
                if (!schemaCheck || schemaCheck(obj)) {
                    const thoughts = text.substring(0, jsonCodeBlock.index).trim();
                    logger_1.Logger.log(`[A.R.I.A] Successfully parsed JSON from code block. Thoughts length: ${thoughts.length}`);
                    return { result: obj, thoughts };
                }
                logger_1.Logger.log(`[A.R.I.A] JSON from code block failed schema check`);
            }
            catch (e) {
                logger_1.Logger.log(`[A.R.I.A] Failed to parse JSON from code block: ${e.message}`);
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
                    logger_1.Logger.log(`[A.R.I.A] Successfully parsed JSON from generic code block. Thoughts length: ${thoughts.length}`);
                    return { result: obj, thoughts };
                }
            }
            catch (e) {
                // Continue to next code block
            }
        }
        // Strategy 3: Find the most complete JSON structure using balanced braces
        logger_1.Logger.log(`[A.R.I.A] Attempting balanced brace approach`);
        const balancedResult = this.findBalancedJson(text, schemaCheck);
        if (balancedResult) {
            logger_1.Logger.log(`[A.R.I.A] Successfully found balanced JSON. Thoughts length: ${balancedResult.thoughts?.length || 0}`);
            return balancedResult;
        }
        // Strategy 4: Aggressive cleanup - remove all non-JSON content
        logger_1.Logger.log(`[A.R.I.A] Attempting aggressive cleanup approach`);
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
                    logger_1.Logger.log(`[A.R.I.A] Successfully parsed JSON from aggressive cleanup. Thoughts length: ${thoughts.length}`);
                    return { result: obj, thoughts };
                }
            }
        }
        catch (e) {
            logger_1.Logger.log(`[A.R.I.A] Aggressive cleanup failed: ${e.message}`);
        }
        throw new Error("No valid JSON found in response after all extraction strategies");
    }
    static findBalancedJson(text, schemaCheck) {
        let braceCount = 0;
        let jsonStart = -1;
        let jsonEnd = -1;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (braceCount === 0) {
                    jsonStart = i;
                }
                braceCount++;
            }
            else if (text[i] === '}') {
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
                    }
                    catch (e) {
                        // Continue searching
                    }
                }
            }
        }
        return null;
    }
    static async callGemini(apiKey, model, payload, retries = 1) {
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
            // LOWER TEMPERATURE: 1.0 is too creative for strict diffs. 
            // Lowering to 0.4 to ensure it follows the "Strict Unified Diff" format.
            finalPayload.generationConfig.temperature = 0.4;
            // Note: We are using default "High" thinking level for Pro/Flash.
            // Explicitly enabling thinking to ensure deep reasoning
            finalPayload.generationConfig.thinkingConfig = { include_thoughts: true };
            // Increase output tokens for Thinking models to prevent JSON truncation
            finalPayload.generationConfig.maxOutputTokens = 65536;
            // Vision: Add media_resolution if image is present
            if (finalPayload.contents?.[0]?.parts) {
                finalPayload.contents[0].parts = finalPayload.contents[0].parts.map((p) => {
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
                logger_1.Logger.log(`[A.R.I.A] Rate limit hit for ${model}. Retrying in 2s...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                clearTimeout(id); // Clear previous timeout
                return this.callGemini(apiKey, model, payload, retries - 1);
            }
            if (response.status === 503 && retries > 0) {
                const backoff = 2000 * (3 - retries + 1); // 2s, 4s, 6s...
                logger_1.Logger.log(`[A.R.I.A] Server Overloaded (503) for ${model}. Backing off for ${backoff}ms...`);
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
            // DEBUG: Log the full response structure
            if (data?.candidates?.[0]?.content) {
                logger_1.Logger.log(`[A.R.I.A] DEBUG: Received Response Structure: ${JSON.stringify(data.candidates[0].content, null, 2)}`);
            }
            const parts = data?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts)
                ? parts.map((p) => p?.text).filter((t) => t && t.trim().length > 0).join("\n\n")
                : data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text)
                throw new Error("No valid text found in response");
            // Parse Markdown to restore structure
            const structured = this.parseMarkdownResponse(text);
            return {
                summary: structured.summary || "Analysis Completed",
                detectedIssues: structured.detectedIssues || [],
                recommendations: structured.recommendations || [],
                confidence: 1.0,
                thoughtProcess: text,
                suggestions: structured.suggestions
            };
        }
        catch (e) {
            logger_1.Logger.log("[A.R.I.A] Failed to parse AI response: " + e);
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText)
                logger_1.Logger.log(`[A.R.I.A] Raw Output (Full):\n${rawText}`);
            throw e;
        }
    }
    static async listAvailableModels(apiKey) {
        const config = vscode.workspace.getConfiguration('aria');
        let key = apiKey || config.get('apiKey') || process.env.GEMINI_API_KEY;
        if (!key)
            return [];
        key = key.trim();
        const response = await fetch(`${this.BASE_URL}?key=${key}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Model list failed: ${response.status} - ${text}`);
        }
        const data = await response.json();
        const models = Array.isArray(data.models) ? data.models : [];
        return models
            .map((m) => (m.name || '').replace('models/', ''))
            .filter((name) => name.startsWith('gemini'));
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
GeminiClient.TIMEOUT_MS = 90000; // Increased to 90s for Gemini 3 Thinking
GeminiClient.FALLBACK_MODELS = [
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash",
    "gemini-flash-latest"
];
//# sourceMappingURL=geminiClient.js.map