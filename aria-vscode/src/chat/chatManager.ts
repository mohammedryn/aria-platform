import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: any;
}

export interface ChatSession {
    id: string;
    title: string;
    created: number;
    lastModified: number;
    messages: ChatMessage[];
}

export class ChatManager {
    private _storagePath: string;
    private _currentSessionId: string | null = null;
    private _sessions: Map<string, ChatSession> = new Map();

    constructor(context: vscode.ExtensionContext) {
        // Use workspace storage if available, otherwise global (fallback)
        // We prefer workspace storage to keep context relevant to the project.
        const storageUri = context.storageUri || context.globalStorageUri;
        this._storagePath = path.join(storageUri.fsPath, 'chat_history.json');
        
        // Ensure directory exists
        if (!fs.existsSync(storageUri.fsPath)) {
            fs.mkdirSync(storageUri.fsPath, { recursive: true });
        }

        this.loadSessions();
    }

    private loadSessions() {
        try {
            if (fs.existsSync(this._storagePath)) {
                const data = fs.readFileSync(this._storagePath, 'utf8');
                const sessions = JSON.parse(data) as ChatSession[];
                this._sessions.clear();
                sessions.forEach(s => this._sessions.set(s.id, s));
                
                // Sort by last modified (desc)
                const sorted = sessions.sort((a, b) => b.lastModified - a.lastModified);
                if (sorted.length > 0) {
                    // Don't auto-select, let UI decide, but we know what's available
                }
            }
        } catch (e) {
            Logger.log(`[ChatManager] Failed to load history: ${e}`);
        }
    }

    private saveSessions() {
        try {
            const sessions = Array.from(this._sessions.values());
            fs.writeFileSync(this._storagePath, JSON.stringify(sessions, null, 2));
        } catch (e) {
            Logger.log(`[ChatManager] Failed to save history: ${e}`);
        }
    }

    public getSessions(): ChatSession[] {
        return Array.from(this._sessions.values()).sort((a, b) => b.lastModified - a.lastModified);
    }

    public getSession(id: string): ChatSession | undefined {
        return this._sessions.get(id);
    }

    public createSession(title?: string): ChatSession {
        const id = this.generateId();
        const session: ChatSession = {
            id,
            title: title || "New Chat",
            created: Date.now(),
            lastModified: Date.now(),
            messages: []
        };
        this._sessions.set(id, session);
        this._currentSessionId = id;
        this.saveSessions();
        return session;
    }

    public deleteSession(id: string) {
        if (this._sessions.has(id)) {
            this._sessions.delete(id);
            if (this._currentSessionId === id) {
                this._currentSessionId = null;
            }
            this.saveSessions();
        }
    }

    public addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any) {
        const session = this._sessions.get(sessionId);
        if (session) {
            session.messages.push({
                role,
                content,
                timestamp: Date.now(),
                metadata
            });
            session.lastModified = Date.now();
            
            // Auto-generate title if it's the first user message and title is generic
            if (role === 'user' && session.messages.filter(m => m.role === 'user').length === 1 && session.title === "New Chat") {
                session.title = this.truncateTitle(content);
            }

            this.saveSessions();
        }
    }

    public getCurrentSessionId(): string | null {
        return this._currentSessionId;
    }

    public setCurrentSession(id: string) {
        if (this._sessions.has(id)) {
            this._currentSessionId = id;
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private truncateTitle(content: string): string {
        const firstLine = content.split('\n')[0];
        return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
    }
}
