# Fix Gemini 3 JSON Parsing Issues

## Status: ✅ Resolved

## Problem Analysis
The Gemini 3 API (specifically `gemini-3-flash-preview` and `pro`) often returns "thinking" text (Chain of Thought) mixed with the requested JSON output, even when explicitly instructed to output **ONLY** JSON.
This caused persistent parsing failures:
- `Unexpected token '*'` (Markdown in thinking text)
- `Unexpected token 'T'` (Thinking text start)
- Mixed content: `Here is the analysis: { ... }`

Strategies to enforce JSON (system instructions, negative constraints) were ignored by the model's strong "thinking" behavior.

## Implemented Solution: Plain Text Strategy + Thinking Process UI

Instead of fighting the model's behavior, we embraced it. We pivoted from "Enforce JSON" to "Structured Plain Text".

### 1. Prompt Engineering Update
- Removed "Output ONLY JSON" constraint.
- Instructed the model to output a structured text response with specific sections:
  1.  `# Thinking Process`: The model's reasoning (CoT).
  2.  `# Summary`: Concise result.
  3.  `# Recommendations`: Bullet points.
  4.  `# Suggestions`: Unified Diffs in markdown code blocks.

### 2. Client-Side Changes (`geminiClient.ts`)
- Updated `analyzeCode` and `analyzeSerialLogs` to bypass `JSON.parse`.
- The entire response text is now treated as the "Thinking Process" and passed directly to the UI.
- Removed complex/brittle regex extraction logic for these main commands.
- Fixed TypeScript interface mismatches (`AnalysisInput`).

### 3. UI Updates (`aria-panel.html`)
- Added a "Gemini 3 Thinking Process" container.
- Uses the `<details>` and `<summary>` HTML elements to create a collapsible view (similar to Cursor Air / Antigravity).
- Renders the raw Markdown response directly, preserving the model's formatting, diffs, and reasoning.
- Default state: **Open** (to show the user the "thinking").

## Benefits
- **Zero Parsing Errors**: We no longer parse JSON, so we can't fail on invalid JSON.
- **Better UX**: Users can see *why* the AI made a decision (Transparency).
- **Native Behavior**: Aligns with how reasoning models (Gemini 3, o1, R1) are designed to work.
- **Resilience**: Formatting glitches in the text don't break the entire response.
