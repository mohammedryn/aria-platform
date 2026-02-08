export interface AnalysisInput {
    source: "selection" | "file" | "terminal";
    code: string;
    language: string;
    filePath: string;
    hardwareContext?: string;
    visionContext?: {
        boards: string[];
        components: string[];
        confidence: number;
    };
    context?: string;
    taskDescription?: string;
}

export interface CodeSuggestion {
    description: string;
    diff: string; // unified diff format
    filePath?: string; // Target file for this suggestion
}

export interface AnalysisOutput {
    summary: string;
    detectedIssues: string[];
    recommendations: string[];
    suggestions?: CodeSuggestion[];
    confidence: number;
    thoughtProcess?: string;
}

export interface SerialAnalysisResult {
    suspectedIssues: string[];
    likelyRootCauses: string[];
    confidence: number;
    thoughtProcess?: string;
    suggestedFixes: {
        description: string;
        relatedCode?: string;
        diff?: string;
    }[];
}
