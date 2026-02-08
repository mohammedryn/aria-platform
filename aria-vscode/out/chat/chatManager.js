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
    loadSessions() {
        try {
            if (fs.existsSync(this._storagePath)) {
                const data = fs.readFileSync(this._storagePath, 'utf8');
                const sessions = JSON.parse(data);
                this._sessions.clear();
                sessions.forEach(s => this._sessions.set(s.id, s));
                // Sort by last modified (desc)
                const sorted = sessions.sort((a, b) => b.lastModified - a.lastModified);
                if (sorted.length > 0) {
                    // Don't auto-select, let UI decide, but we know what's available
                }
            }
        }
        catch (e) {
            logger_1.Logger.log(`[ChatManager] Failed to load history: ${e}`);
        }
    }
    saveSessions() {
        try {
            const sessions = Array.from(this._sessions.values());
            fs.writeFileSync(this._storagePath, JSON.stringify(sessions, null, 2));
        }
        catch (e) {
            logger_1.Logger.log(`[ChatManager] Failed to save history: ${e}`);
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