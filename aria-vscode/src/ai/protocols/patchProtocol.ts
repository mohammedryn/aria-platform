export type PatchOperation = 'replace' | 'insert_after' | 'delete' | 'create';

export interface FileEdit {
    /** Relative path to the file (e.g. "src/main.cpp") */
    file_path: string;

    /** The type of edit operation */
    operation: PatchOperation;

    /**
     * 1-based start line number (inclusive).
     * For 'replace'/'delete': First line to change/remove.
     * For 'insert_after': Line after which content is inserted.
     * For 'create': Use 0.
     */
    start_line: number;

    /**
     * 1-based end line number (inclusive).
     * Required for 'replace' and 'delete'.
     * Ignored for 'insert_after' and 'create'.
     */
    end_line?: number;

    /**
     * New code content.
     * Required for 'replace', 'insert_after', and 'create'.
     * Ignored for 'delete'.
     */
    content?: string;

    /** Explanation of why this change is needed. */
    explanation: string;
}

export interface AIPatchResponse {
    /** SHA256 hash of the target file contents at time of analysis */
    file_hash: string;

    /** Short summary of the overall change */
    summary: string;

    /** List of atomic edits */
    edits: FileEdit[];
}
