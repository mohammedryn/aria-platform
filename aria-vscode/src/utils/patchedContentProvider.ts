import * as vscode from 'vscode';

export class PatchedContentProvider implements vscode.TextDocumentContentProvider {
    public static readonly scheme = 'aria-preview';
    private static _instance: PatchedContentProvider;
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _documents = new Map<string, string>();

    public static getInstance(): PatchedContentProvider {
        if (!PatchedContentProvider._instance) {
            PatchedContentProvider._instance = new PatchedContentProvider();
        }
        return PatchedContentProvider._instance;
    }

    public static register(context: vscode.ExtensionContext) {
        const provider = PatchedContentProvider.getInstance();
        context.subscriptions.push(
            vscode.workspace.registerTextDocumentContentProvider(PatchedContentProvider.scheme, provider)
        );
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this._documents.get(uri.toString()) || "";
    }

    public setContent(uri: vscode.Uri, content: string) {
        this._documents.set(uri.toString(), content);
        this._onDidChange.fire(uri);
    }
}
