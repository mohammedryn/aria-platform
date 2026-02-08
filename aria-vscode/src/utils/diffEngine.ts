
import * as vscode from 'vscode';
import { Logger } from './logger';

export class DiffEngine {

    /**
     * Applies a unified diff to a string (the original file content).
     * This is used to generate the "preview" content for the diff view.
     */
    public static applyPatch(original: string, diff: string): string | null {
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
                        const newChunkLines: string[] = [];
                        
                        // We need to advance i to the next chunk or end
                        while (chunkIndex < diffLines.length) {
                            const diffLine = diffLines[chunkIndex];
                            if (diffLine.startsWith('@@')) break; // Next chunk
                            
                            if (diffLine.startsWith('-')) {
                                linesToRemove++;
                            } else if (diffLine.startsWith('+')) {
                                newChunkLines.push(diffLine.substring(1));
                            } else if (diffLine.startsWith(' ')) {
                                // Context line, keep it (in a patch we might verify it matches)
                                newChunkLines.push(diffLine.substring(1));
                            } else if (diffLine === '') {
                                // Empty line, treat as context? Or end?
                                // Sometimes empty context lines don't have space.
                                // Let's assume context.
                                newChunkLines.push("");
                            } else {
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
                            Logger.log(`[DiffEngine] Patch out of bounds: index ${insertionIndex}, len ${resultLines.length}`);
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
                        
                        const replacementLines: string[] = [];
                        
                        while (ptr < diffLines.length) {
                            const dl = diffLines[ptr];
                            if (dl.startsWith('@@')) break;
                            
                            if (dl.startsWith(' ')) {
                                // Context
                                replacementLines.push(lines[currentOriginalIndex]);
                                currentOriginalIndex++;
                                linesProcessed++;
                            } else if (dl.startsWith('-')) {
                                // Deletion - we skip adding to replacement, and advance original
                                currentOriginalIndex++;
                                linesProcessed++;
                            } else if (dl.startsWith('+')) {
                                // Addition
                                replacementLines.push(dl.substring(1));
                            }
                            ptr++;
                        }
                        
                        // Now we replace the block in resultLines
                        // The block started at (oldStart + offset) and had length (linesProcessed + previous_shifts?)
                        // Wait, the "lines" array is the ORIGINAL. 
                        // If we use `offset`, we are modifying `resultLines`.
                        
                        // Robustness Fix: Calculate lines to delete from the hunk content itself
                        // rather than relying solely on the header's line count, which AI often gets wrong.
                        let calculatedOldCount = 0;
                        const chunkNewLines: string[] = [];
                        
                        let p = i + 1;
                        while (p < diffLines.length) {
                            const l = diffLines[p];
                            if (l.startsWith('@@')) break; // End of hunk

                            if (l.startsWith(' ') || l.startsWith('-')) {
                                calculatedOldCount++;
                            }
                            
                            if (l.startsWith('+') || l.startsWith(' ')) {
                                chunkNewLines.push(l.substring(1));
                            } else if (l === '') {
                                // Empty line, treat as context
                                chunkNewLines.push('');
                                calculatedOldCount++; // It's a context line (conceptually a space)
                            }
                            p++;
                        }

                        // Use the calculated count if it seems valid (contains actual content lines)
                        // If the AI was lazy and provided NO context/deletion lines but set a header count,
                        // we might fallback to header, but usually AI provides the content.
                        // We'll trust the content scan primarily.
                        const linesToDelete = calculatedOldCount;

                        // Perform Splice
                        // Remove `linesToDelete` lines at `oldStart + offset`
                        // Insert `chunkNewLines`
                        
                        // Safety Check: Don't delete past end of file
                        if (oldStart + offset + linesToDelete > resultLines.length) {
                             Logger.log(`[DiffEngine] Warning: Hunk tries to delete past EOF. Truncating.`);
                        }
                        
                        resultLines.splice(oldStart + offset, linesToDelete, ...chunkNewLines);
                        
                        // Update offset
                        // Offset change = (lines added) - (lines removed)
                        offset += (chunkNewLines.length - linesToDelete);
                        
                        i = p;
                        continue; // Next chunk
                    }
                }
                i++;
            }
            
            return resultLines.join('\n');
            
        } catch (e) {
            Logger.log(`[DiffEngine] Error applying patch: ${e}`);
            return null;
        }
    }
}
