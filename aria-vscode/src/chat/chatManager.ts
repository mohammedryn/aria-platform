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
    private _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        // Use workspace storage if available, otherwise global (fallback)
        // We prefer workspace storage to keep context relevant to the project.
        const storageUri = context.storageUri || context.globalStorageUri;
        this._storagePath = path.join(storageUri.fsPath, 'chat_history.json');

        // Ensure directory exists
        if (!fs.existsSync(storageUri.fsPath)) {
            try {
                fs.mkdirSync(storageUri.fsPath, { recursive: true });
            } catch (e) {
                Logger.log(`[ChatManager] Failed to create storage directory: ${e}`);
            }
        }

        this.loadSessions();
    }

    private loadSessions() {
        try {
            let loaded = false;

            // 1. Try File Storage
            if (fs.existsSync(this._storagePath)) {
                const data = fs.readFileSync(this._storagePath, 'utf8');
                const sessions = JSON.parse(data) as ChatSession[];
                if (sessions && sessions.length > 0) {
                    this._sessions.clear();
                    sessions.forEach(s => this._sessions.set(s.id, s));
                    Logger.log(`[ChatManager] Loaded ${sessions.length} sessions from file.`);
                    loaded = true;
                }
            }

            // 2. Fallback to GlobalState (Memento) if file failed or empty
            if (!loaded) {
                const backup = this._context.globalState.get<ChatSession[]>('aria_chat_history');
                if (backup && backup.length > 0) {
                    this._sessions.clear();
                    backup.forEach(s => this._sessions.set(s.id, s));
                    Logger.log(`[ChatManager] Loaded ${backup.length} sessions from GlobalState backup.`);
                    loaded = true;
                }
            }

        } catch (e) {
            Logger.log(`[ChatManager] Failed to load history: ${e}`);
            // Last ditch: Try GlobalState even if file read threw error
            const backup = this._context.globalState.get<ChatSession[]>('aria_chat_history');
            if (backup && backup.length > 0) {
                this._sessions.clear();
                backup.forEach(s => this._sessions.set(s.id, s));
            }
        }
    }

    private saveSessions() {
        const sessions = Array.from(this._sessions.values());

        // 1. Save to File
        try {
            fs.writeFileSync(this._storagePath, JSON.stringify(sessions, null, 2));
        } catch (e) {
            Logger.log(`[ChatManager] Failed to save history to file: ${e}`);
        }

        // 2. Save to GlobalState (Backup)
        try {
            this._context.globalState.update('aria_chat_history', sessions);
        } catch (e) {
            Logger.log(`[ChatManager] Failed to save history to GlobalState: ${e}`);
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
