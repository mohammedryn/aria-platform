export interface AnalysisInput {
    source: "selection" | "file";
    code: string;
    language: string;
    filePath: string;
    hardwareContext?: string;
    visionContext?: {
        boards: string[];
        components: string[];
        confidence: number;
    };
}

export interface CodeSuggestion {
    description: string;
    diff: string; // unified diff format
}

export interface AnalysisOutput {
    summary: string;
    detectedIssues: string[];
    recommendations: string[];
    suggestions?: CodeSuggestion[];
    confidence: number;
}
