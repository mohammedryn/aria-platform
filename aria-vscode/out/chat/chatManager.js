"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatManager = void 0;
const fs = require("fs");
const path = require("path");
const logger_1 = require("../utils/logger");
class ChatManager {
    constructor(context) {
        this._currentSessionId = null;
        this._sessions = new Map();
        this._context = context;
        // Use workspace storage if available, otherwise global (fallback)
        // We prefer workspace storage to keep context relevant to the project.
        const storageUri = context.storageUri || context.globalStorageUri;
        this._storagePath = path.join(storageUri.fsPath, 'chat_history.json');
        // Ensure directory exists
        if (!fs.existsSync(storageUri.fsPath)) {
            try {
                fs.mkdirSync(storageUri.fsPath, { recursive: true });
            }
            catch (e) {
                logger_1.Logger.log(`[ChatManager] Failed to create storage directory: ${e}`);
            }
        }
        this.loadSessions();
    }
    loadSessions() {
        try {
            let loaded = false;
            // 1. Try File Storage
            if (fs.existsSync(this._storagePath)) {
                const data = fs.readFileSync(this._storagePath, 'utf8');
                const sessions = JSON.parse(data);
                if (sessions && sessions.length > 0) {
                    this._sessions.clear();
                    sessions.forEach(s => this._sessions.set(s.id, s));
                    logger_1.Logger.log(`[ChatManager] Loaded ${sessions.length} sessions from file.`);
                    loaded = true;
                }
            }
            // 2. Fallback to GlobalState (Memento) if file failed or empty
            if (!loaded) {
                const backup = this._context.globalState.get('aria_chat_history');
                if (backup && backup.length > 0) {
                    this._sessions.clear();
                    backup.forEach(s => this._sessions.set(s.id, s));
                    logger_1.Logger.log(`[ChatManager] Loaded ${backup.length} sessions from GlobalState backup.`);
                    loaded = true;
                }
            }
        }
        catch (e) {
            logger_1.Logger.log(`[ChatManager] Failed to load history: ${e}`);
            // Last ditch: Try GlobalState even if file read threw error
            const backup = this._context.globalState.get('aria_chat_history');
            if (backup && backup.length > 0) {
                this._sessions.clear();
                backup.forEach(s => this._sessions.set(s.id, s));
            }
        }
    }
    saveSessions() {
        const sessions = Array.from(this._sessions.values());
        // 1. Save to File
        try {
            fs.writeFileSync(this._storagePath, JSON.stringify(sessions, null, 2));
        }
        catch (e) {
            logger_1.Logger.log(`[ChatManager] Failed to save history to file: ${e}`);
        }
        // 2. Save to GlobalState (Backup)
        try {
            this._context.globalState.update('aria_chat_history', sessions);
        }
        catch (e) {
            logger_1.Logger.log(`[ChatManager] Failed to save history to GlobalState: ${e}`);
        }
    }
    getSessions() {
        return Array.from(this._sessions.values()).sort((a, b) => b.lastModified - a.lastModified);
    }
    getSession(id) {
        return this._sessions.get(id);
    }
    createSession(title) {
        const id = this.generateId();
        const session = {
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
    deleteSession(id) {
        if (this._sessions.has(id)) {
            this._sessions.delete(id);
            if (this._currentSessionId === id) {
                this._currentSessionId = null;
            }
            this.saveSessions();
        }
    }
    addMessage(sessionId, role, content, metadata) {
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
    getCurrentSessionId() {
        return this._currentSessionId;
    }
    setCurrentSession(id) {
        if (this._sessions.has(id)) {
            this._currentSessionId = id;
        }
    }
    generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    truncateTitle(content) {
        const firstLine = content.split('\n')[0];
        return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
    }
}
exports.ChatManager = ChatManager;
//# sourceMappingURL=chatManager.js.map