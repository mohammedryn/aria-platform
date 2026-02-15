import * as crypto from 'crypto';
import { AIPatchResponse } from '../ai/protocols/patchProtocol';

export function validatePatchResponse(
    patch: AIPatchResponse,
    fileContentMap: Record<string, string>
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Reject if patch.edits is empty.
    if (!patch.edits || patch.edits.length === 0) {
        errors.push("Patch response contains no edits.");
        return { valid: false, errors };
    }

    let totalModifiedLines = 0;

    for (const edit of patch.edits) {
        const fileContent = fileContentMap[edit.file_path];

        // 2. File existence check
        if (edit.operation !== 'create') {
            if (fileContent === undefined) {
                errors.push(`File not found in context: ${edit.file_path}`);
                continue; // Cannot check line bounds if file missing
            }
        }

        const lines = fileContent ? fileContent.split(/\r?\n/) : [];
        const totalLines = lines.length;

        // 3. Start Line Check
        // Protocol: 1-based line numbers.
        // replace/delete: start_line >= 1
        // insert_after: start_line >= 0 (0 = insert at top)
        // create: start_line = 0 (ignored)
        if (edit.operation === 'replace' || edit.operation === 'delete') {
            if (edit.start_line < 1) {
                errors.push(`Invalid start_line ${edit.start_line} for ${edit.operation} in ${edit.file_path} (must be >= 1)`);
            }
        } else if (edit.operation === 'insert_after') {
            if (edit.start_line < 0) {
                errors.push(`Invalid start_line ${edit.start_line} for insert_after in ${edit.file_path} (must be >= 0)`);
            }
        }

        // 4. Bounds & Logic Checks
        if (edit.operation === 'replace' || edit.operation === 'delete') {
            if (edit.end_line === undefined) {
                errors.push(`Missing end_line for ${edit.operation} in ${edit.file_path}`);
            } else {
                if (edit.end_line < edit.start_line) {
                    errors.push(`end_line (${edit.end_line}) < start_line (${edit.start_line}) in ${edit.file_path}`);
                }
                if (edit.end_line > totalLines) {
                    errors.push(`end_line (${edit.end_line}) exceeds file length (${totalLines}) in ${edit.file_path}`);
                }

                const editSize = edit.end_line - edit.start_line + 1;
                if (editSize > 50) {
                    errors.push(`Edit exceeds 50 lines limit in ${edit.file_path} (${editSize} lines)`);
                }
                totalModifiedLines += editSize;
            }
        } else if (edit.operation === 'insert_after') {
            if (edit.start_line > totalLines) {
                errors.push(`start_line (${edit.start_line}) exceeds file length (${totalLines}) in ${edit.file_path}`);
            }
            if (edit.content) {
                const addedLines = edit.content.split(/\r?\n/).length;
                if (addedLines > 50) {
                    errors.push(`Insertion exceeds 50 lines limit in ${edit.file_path} (${addedLines} lines)`);
                }
                totalModifiedLines += addedLines;
            }
        } else if (edit.operation === 'create') {
            if (edit.content) {
                const addedLines = edit.content.split(/\r?\n/).length;
                if (addedLines > 50) {
                    errors.push(`Creation exceeds 50 lines limit in ${edit.file_path} (${addedLines} lines)`);
                }
                totalModifiedLines += addedLines;
            }
        }

        // 5. Content Checks
        if (edit.content) {
            if (edit.content.includes('```')) {
                errors.push(`Content contains markdown fences in ${edit.file_path}`);
            }
        }
    }

    // 6. Total modified lines check
    if (totalModifiedLines > 80) {
        errors.push(`Total modified lines (${totalModifiedLines}) exceeds limit (80).`);
    }

    // 7. Hash Check
    if (patch.file_hash) {
        for (const edit of patch.edits) {
            if (edit.operation === 'create') continue;
            
            const content = fileContentMap[edit.file_path];
            if (content !== undefined) { // Check existence already done, but safe to check again
                // Normalize to match GeminiClient logic
                const normalized = content.replace(/\r\n/g, '\n');
                const currentHash = crypto.createHash('sha256').update(normalized).digest('hex');
                
                if (currentHash !== patch.file_hash) {
                    errors.push(`File hash mismatch for ${edit.file_path}. Expected ${patch.file_hash}, got ${currentHash}. File has changed since analysis.`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
