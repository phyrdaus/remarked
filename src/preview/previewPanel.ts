import * as vscode from "vscode";
import { renderPreviewBody } from "./renderPreviewBody";
import { renderPreviewHtml } from "./previewHtml";
import { createDebouncer } from "./debounce";
import { makeNonce } from "../editor/webviewHtml";
import { resolveCustomCssFsPath } from "../editor/customCss";

/** Owns a single live Preview webview panel (opened Beside the editor). */
export class PreviewPanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private document: vscode.TextDocument | undefined;
  private readonly debouncer = createDebouncer(250);
  private changeSub: vscode.Disposable | undefined;
  private closeSub: vscode.Disposable | undefined;
  private messageSub: vscode.Disposable | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public open(document: vscode.TextDocument): void {
    this.document = document;
    if (this.panel) {
      this.panel.title = this.titleFor(document);
      this.panel.reveal(vscode.ViewColumn.Beside, true);
      this.render();
      return;
    }
    const docDir = vscode.Uri.joinPath(document.uri, "..");
    const customCssFsPath = resolveCustomCssFsPath(
      vscode.workspace.getConfiguration("remarked").get<string>("customCss"),
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    );
    const customCssUri = customCssFsPath ? vscode.Uri.file(customCssFsPath) : undefined;
    this.panel = vscode.window.createWebviewPanel(
      "remarked.preview",
      this.titleFor(document),
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [
          this.extensionUri,
          docDir,
          ...(vscode.workspace.workspaceFolders ?? []).map((f) => f.uri),
          ...(customCssUri ? [vscode.Uri.joinPath(customCssUri, "..")] : []),
        ],
      }
    );
    const webview = this.panel.webview;
    this.messageSub = webview.onDidReceiveMessage((msg) => {
      if (msg?.type === "ready") this.render();
    });
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist", "webview");
    webview.html = renderPreviewHtml({
      cspSource: webview.cspSource,
      scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(dist, "preview.js")).toString(),
      styleUris: [
        webview.asWebviewUri(vscode.Uri.joinPath(dist, "katex.min.css")).toString(),
        ...(customCssUri ? [webview.asWebviewUri(customCssUri).toString()] : []),
      ],
      nonce: makeNonce(),
    });

    this.changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === this.document && e.contentChanges.length > 0) {
        this.debouncer.schedule(() => this.render());
      }
    });
    this.panel.onDidDispose(() => {
      this.debouncer.cancel();
      this.changeSub?.dispose();
      this.changeSub = undefined;
      this.closeSub?.dispose();
      this.closeSub = undefined;
      this.messageSub?.dispose();
      this.messageSub = undefined;
      this.panel = undefined;
      this.document = undefined;
    });
    // Close the panel if its document is closed.
    this.closeSub = vscode.workspace.onDidCloseTextDocument((doc) => {
      if (doc === this.document) this.panel?.dispose();
    });
  }

  private titleFor(document: vscode.TextDocument): string {
    return "Preview: " + (document.uri.path.split("/").pop() ?? "Document");
  }

  private render(): void {
    if (!this.panel || !this.document) return;
    const webview = this.panel.webview;
    const docDir = vscode.Uri.joinPath(this.document.uri, "..");
    const body = renderPreviewBody(this.document.getText(), (src) => {
      try {
        const uri = src.startsWith("/")
          ? vscode.Uri.file(decodeURI(src))
          : vscode.Uri.joinPath(docDir, decodeURI(src));
        return webview.asWebviewUri(uri).toString();
      } catch {
        return null;
      }
    });
    void webview.postMessage({ type: "render", html: body.html, mermaidSources: body.mermaidSources });
  }

  public dispose(): void {
    this.debouncer.cancel();
    this.changeSub?.dispose();
    this.closeSub?.dispose();
    this.messageSub?.dispose();
    this.panel?.dispose();
  }
}
