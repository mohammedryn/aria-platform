import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { getLastActiveEditor } from '../utils/editorContext';

export interface HardwareInfo {
    projects: PlatformIOProject[];
    summary: string;
}

export interface PlatformIOProject {
    path: string;
    envs: string[];
    board: string;
    framework: string;
    libraries: string[];
}

export class HardwareContext {
    
    public static async getPlatformIOContext(workspaceRoot: string): Promise<PlatformIOProject | null> {
        const info = await this.scan();
        // Return the first project that matches or is contained in the workspace root, or just the first one found
        // Since scan() already handles workspace logic, we can return the first project
        if (info.projects.length > 0) {
            return info.projects[0];
        }
        return null;
    }

    public static async scan(): Promise<HardwareInfo> {
        const projects: PlatformIOProject[] = [];
        
        // 1. Find all platformio.ini files in the workspace
        let pioFiles = await vscode.workspace.findFiles('**/platformio.ini', '**/node_modules/**');
        
        // 2. Fallback: If no workspace files, check relative to active editor (Single File Mode)
        const editor = getLastActiveEditor();
        if (pioFiles.length === 0 && editor) {
            const currentDoc = editor.document.uri;
            const folder = vscode.workspace.getWorkspaceFolder(currentDoc);
            
            // Try to look up the directory tree
            if (!folder) {
                 // Manual walk up could be done here, but for now let's check if the file itself is in a PIO structure
                 // For now, we'll just log that we are in single file mode
                 Logger.log("[HardwareContext] Single file mode - scanning parent directories...");
                 try {
                     const path = require('path');
                     const fs = require('fs');
                     let currentDir = path.dirname(currentDoc.fsPath);
                     
                     // Walk up 3 levels to find platformio.ini
                     for (let i = 0; i < 3; i++) {
                         const pioPath = path.join(currentDir, 'platformio.ini');
                         if (fs.existsSync(pioPath)) {
                             pioFiles = [vscode.Uri.file(pioPath)];
                             break;
                         }
                         currentDir = path.dirname(currentDir);
                     }
                 } catch (e) {
                     Logger.log(`[HardwareContext] Single file scan error: ${e}`);
                 }
            }
        }

        if (pioFiles.length === 0) {
            return { projects: [], summary: "No hardware configuration found (platformio.ini missing)." };
        }

        Logger.log(`[HardwareContext] Found ${pioFiles.length} PlatformIO config files.`);

        for (const file of pioFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(file);
                const text = doc.getText();
                projects.push(this.parseIni(text, vscode.workspace.asRelativePath(file)));
            } catch (e) {
                Logger.log(`[HardwareContext] Failed to read ${file.fsPath}: ${e}`);
            }
        }

        const summary = this.generateSummary(projects);
        return { projects, summary };
    }

    private static parseIni(content: string, path: string): PlatformIOProject {
        const envs: string[] = [];
        let board = 'unknown';
        let framework = 'unknown';
        const libraries: string[] = [];
        let inLibDeps = false;

        const lines = content.split('\n');
        for (const line of lines) {
            const l = line.trim();
            
            if (l.startsWith('lib_deps')) {
                inLibDeps = true;
                if (l.includes('=')) {
                    const val = l.split('=')[1].trim();
                    if (val) this.extractLib(val, libraries);
                }
                continue;
            }
            
            if (l.startsWith('[') || (l.includes('=') && !l.startsWith(' '))) {
                if (!l.startsWith('lib_deps')) inLibDeps = false;
            }

            if (inLibDeps && l) {
                this.extractLib(l, libraries);
            }

            if (l.startsWith('[env:')) {
                envs.push(l.substring(5, l.length - 1));
            } else if (l.startsWith('board =')) {
                board = l.split('=')[1].trim();
            } else if (l.startsWith('framework =')) {
                framework = l.split('=')[1].trim();
            }
        }

        return { path, envs, board, framework, libraries };
    }

    private static extractLib(line: string, libraries: string[]) {
        // Handle "vendor/lib @ ^1.0" or just "lib"
        let lib = line.trim();
        if (lib && !lib.startsWith(';')) {
            if (lib.includes('@')) {
                lib = lib.split('@')[0].trim();
            }
            libraries.push(lib);
        }
    }

    private static generateSummary(projects: PlatformIOProject[]): string {
        if (projects.length === 0) return "No hardware context.";
        
        let summary = "HARDWARE CONTEXT (PlatformIO):\n";
        projects.forEach(p => {
            summary += `- Config: ${p.path}\n`;
            summary += `  Target: ${p.board} (Framework: ${p.framework})\n`;
            if (p.libraries.length > 0) {
                summary += `  Libraries: ${p.libraries.join(', ')}\n`;
            }
        });
        return summary;
    }
}
