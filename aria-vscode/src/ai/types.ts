export interface AnalysisInput {
    code: string;
    filePath: string;
    source: 'selection' | 'file' | 'terminal' | 'build_error';
    language: string;
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
