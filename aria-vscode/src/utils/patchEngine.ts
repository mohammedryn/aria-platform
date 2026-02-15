import * as vscode from 'vscode';
import { AIPatchResponse, FileEdit } from '../ai/protocols/patchProtocol';

export async function applyJsonPatch(
    patch: AIPatchResponse,
    fileContentMap: Record<string, string>
): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceRoot) {
        throw new Error("No workspace open. Cannot apply patch.");
    }

    for (const change of patch.edits) {
        // Resolve URI
        // Assuming file_path is relative to workspace root
        const uri = vscode.Uri.file(`${workspaceRoot}/${change.file_path}`);

        if (change.operation === 'create') {
            edit.createFile(uri, { overwrite: true });
            if (change.content) {
                edit.insert(uri, new vscode.Position(0, 0), change.content);
            }
        } else {
            // For existing files, we assume they exist (validated previously)
            // But we need to handle line ranges.
            
            // Convert 1-based lines to 0-based VS Code Ranges
            // Replace/Delete: S to E (inclusive 1-based)
            // VS Code Range: S-1 to E (exclusive 0-based, covers full lines)
            
            if (change.operation === 'replace' || change.operation === 'delete') {
                if (change.end_line === undefined) {
                    throw new Error(`Missing end_line for ${change.operation} in ${change.file_path}`);
                }
                
                const startLine = change.start_line - 1;
                const endLine = change.end_line; // 0-based exclusive for full line coverage
                
                const range = new vscode.Range(
                    new vscode.Position(startLine, 0),
                    new vscode.Position(endLine, 0)
                );

                if (change.operation === 'replace') {
                    // Ensure content ends with newline if replacing full lines? 
                    // Protocol implies content replaces the lines. 
                    // Usually code blocks might not have trailing newline, but lines do.
                    // We should append newline if the replacement is meant to be a block of lines.
                    // However, let's trust the AI to provide correct content for now, or ensure we append newline if missing?
                    // Safe approach: The range covers the newline of the last line.
                    // So we must provide content that *includes* necessary newlines if we want them.
                    // Standard diffs usually include the newline.
                    // Let's assume content is the raw string to put there.
                    let newContent = change.content || "";
                    if (!newContent.endsWith('\n')) {
                        newContent += '\n';
                    }
                    edit.replace(uri, range, newContent);
                } else { // delete
                    edit.delete(uri, range);
                }
            } else if (change.operation === 'insert_after') {
                // Insert after line N (1-based).
                // Insertion point: Start of line N+1 (1-based) -> Line N (0-based).
                // If N=0 (insert at top), insertion point is Line 0 (0-based).
                
                const insertLine = change.start_line;
                const position = new vscode.Position(insertLine, 0);
                
                let newContent = change.content || "";
                if (!newContent.endsWith('\n')) {
                    newContent += '\n';
                }
                
                edit.insert(uri, position, newContent);
            }
        }
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (!success) {
        throw new Error("Failed to apply WorkspaceEdit. VS Code rejected the changes.");
    }
    
    // Save all affected documents? 
    // vscode.workspace.applyEdit does NOT save automatically, but dirty documents are open.
    // We should iterate and save.
    for (const change of patch.edits) {
        const uri = vscode.Uri.file(`${workspaceRoot}/${change.file_path}`);
        const doc = await vscode.workspace.openTextDocument(uri);
        await doc.save();
    }
}
