"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffEngine = void 0;
const logger_1 = require("./logger");
class DiffEngine {
    /**
     * Applies a unified diff to a string (the original file content).
     * This is used to generate the "preview" content for the diff view.
     */
    static applyPatch(original, diff) {
        try {
            const lines = original.split(/\r?\n/);
            const diffLines = diff.split(/\r?\n/);
            let resultLines = [...lines];
            let offset = 0; // Tracks line number shifts
            // Simple parser for standard unified diffs
            // We assume the AI returns a valid unified diff chunk
            // e.g. @@ -10,4 +10,5 @@
            let i = 0;
            while (i < diffLines.length) {
                const line = diffLines[i];
                if (line.startsWith('@@')) {
                    // Parse Header: @@ -oldStart,oldCount +newStart,newCount @@
                    // Example: @@ -4,2 +4,3 @@
                    const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
                    if (match) {
                        const oldStart = parseInt(match[1], 10) - 1; // 0-indexed
                        const oldLineCount = match[2] ? parseInt(match[2], 10) : 1;
                        // The +newStart is not strictly needed for patching if we just follow the +/- instructions,
                        // but it helps verify context.
                        // Collect the chunk lines
                        let chunkIndex = i + 1;
                        let linesToRemove = 0;
                        const newChunkLines = [];
                        // We need to advance i to the next chunk or end
                        while (chunkIndex < diffLines.length) {
                            const diffLine = diffLines[chunkIndex];
                            if (diffLine.startsWith('@@'))
                                break; // Next chunk
                            if (diffLine.startsWith('-')) {
                                linesToRemove++;
                            }
                            else if (diffLine.startsWith('+')) {
                                newChunkLines.push(diffLine.substring(1));
                            }
                            else if (diffLine.startsWith(' ')) {
                                // Context line, keep it (in a patch we might verify it matches)
                                newChunkLines.push(diffLine.substring(1));
                            }
                            else if (diffLine === '') {
                                // Empty line, treat as context? Or end?
                                // Sometimes empty context lines don't have space.
                                // Let's assume context.
                                newChunkLines.push("");
                            }
                            else {
                                // Unknown? Maybe a path header?
                                if (diffLine.startsWith('---') || diffLine.startsWith('+++')) {
                                    // Header lines, skip
                                }
                            }
                            chunkIndex++;
                        }
                        // Apply the patch to resultLines
                        // Note: A real patcher needs to be robust. 
                        // Since we are replacing lines, we can use splice.
                        // We need to account for previous shifts if we had multiple chunks?
                        // Actually, if we use the line numbers from the header, we must handle offset manually.
                        // BUT, if we iterate linearly, we can just rebuild the file.
                        // Let's try a simpler approach: Rebuild the file line by line?
                        // No, unified diffs jump around.
                        // Let's use the Header information.
                        // "oldStart" is the index in the ORIGINAL file.
                        // We need to map that to the CURRENT resultLines index.
                        // Current Index = Old Index + Offset.
                        const insertionIndex = oldStart + offset;
                        // Verify we are not out of bounds
                        if (insertionIndex > resultLines.length) {
                            logger_1.Logger.log(`[DiffEngine] Patch out of bounds: index ${insertionIndex}, len ${resultLines.length}`);
                            return null;
                        }
                        // Remove old lines
                        // We remove 'oldLineCount' lines starting at insertionIndex
                        // Wait, unified diffs include context in the count.
                        // We must differentiate between context lines and removed lines.
                        // Let's try a safer way:
                        // Read the chunk lines. Match them to the original lines to verify context.
                        // Construct the replacement block.
                        // Actually, since we want to be "Cursor-like", we can cheat slightly if the AI is good.
                        // But let's write a robust-ish patcher.
                        let currentOriginalIndex = oldStart;
                        let linesProcessed = 0;
                        let ptr = i + 1;
                        const replacementLines = [];
                        while (ptr < diffLines.length) {
                            const dl = diffLines[ptr];
                            if (dl.startsWith('@@'))
                                break;
                            if (dl.startsWith(' ')) {
                                // Context
                                replacementLines.push(lines[currentOriginalIndex]);
                                currentOriginalIndex++;
                                linesProcessed++;
                            }
                            else if (dl.startsWith('-')) {
                                // Deletion - we skip adding to replacement, and advance original
                                currentOriginalIndex++;
                                linesProcessed++;
                            }
                            else if (dl.startsWith('+')) {
                                // Addition
                                replacementLines.push(dl.substring(1));
                            }
                            ptr++;
                        }
                        // Now we replace the block in resultLines
                        // The block started at (oldStart + offset) and had length (linesProcessed + previous_shifts?)
                        // Wait, the "lines" array is the ORIGINAL. 
                        // If we use `offset`, we are modifying `resultLines`.
                        // Let's restart the strategy:
                        // 1. We have `resultLines` which starts as copy of `original`.
                        // 2. We apply edits from bottom to top? No, diffs are usually top to bottom.
                        // 3. We use `offset` to track how the line count has changed.
                        const linesToDelete = oldLineCount;
                        // In a unified diff, the 'old' count includes context lines + deleted lines.
                        // We need to extract the "new" block from the diff chunk (additions + context).
                        // And replace the "old" block (deletions + context) in the file.
                        const chunkNewLines = [];
                        let p = i + 1;
                        while (p < diffLines.length && !diffLines[p].startsWith('@@')) {
                            const l = diffLines[p];
                            if (l.startsWith('+') || l.startsWith(' ')) {
                                chunkNewLines.push(l.substring(1));
                            }
                            else if (l === '') {
                                // Empty line, treat as context
                                chunkNewLines.push('');
                            }
                            p++;
                        }
                        // Perform Splice
                        // Remove `oldLineCount` lines at `oldStart + offset`
                        // Insert `chunkNewLines`
                        resultLines.splice(oldStart + offset, oldLineCount, ...chunkNewLines);
                        // Update offset
                        // Offset change = (lines added) - (lines removed)
                        // lines added = chunkNewLines.length
                        // lines removed = oldLineCount
                        offset += (chunkNewLines.length - oldLineCount);
                        i = p;
                        continue; // Next chunk
                    }
                }
                i++;
            }
            return resultLines.join('\n');
        }
        catch (e) {
            logger_1.Logger.log(`[DiffEngine] Error applying patch: ${e}`);
            return null;
        }
    }
}
exports.DiffEngine = DiffEngine;
//# sourceMappingURL=diffEngine.js.map