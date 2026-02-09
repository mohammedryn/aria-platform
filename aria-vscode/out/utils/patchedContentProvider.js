"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchedContentProvider = void 0;
const vscode = require("vscode");
class PatchedContentProvider {
    constructor() {
        this._onDidChange = new vscode.EventEmitter();
        this._documents = new Map();
    }
    static getInstance() {
        if (!PatchedContentProvider._instance) {
            PatchedContentProvider._instance = new PatchedContentProvider();
        }
        return PatchedContentProvider._instance;
    }
    static register(context) {
        const provider = PatchedContentProvider.getInstance();
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(PatchedContentProvider.scheme, provider));
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    provideTextDocumentContent(uri) {
        return this._documents.get(uri.toString()) || "";
    }
    setContent(uri, content) {
        this._documents.set(uri.toString(), content);
        this._onDidChange.fire(uri);
    }
}
exports.PatchedContentProvider = PatchedContentProvider;
PatchedContentProvider.scheme = 'aria-preview';
//# sourceMappingURL=patchedContentProvider.js.map