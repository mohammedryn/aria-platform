export interface AnalysisResult {
    source: "selection" | "file" | "workspace";
    filePath?: string;
    language?: string;
    lines?: number;
    size?: number; // characters
    timestamp: number;
    metadata?: Record<string, any>;
}
