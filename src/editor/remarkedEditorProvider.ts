import * as vscode from "vscode";
import type { ToHost, ToWebview } from "../shared/messages";
import type { Replacement } from "../shared/replace";
import { makeNonce, renderWebviewHtml } from "./webviewHtml";
import { isOpenableHref } from "../shared/links";
import { saveImageAsset } from "./assetService";
import { resolveCustomCssFsPath } from "./customCss";

export class RemarkedEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "remarked.editor";

  /** One entry per live editor; insertion order backs postToLatestWebview. */
  private readonly sessions = new Map<vscode.WebviewPanel, { document: vscode.TextDocument; renderAnyway: boolean }>();
  private readonly testMessages = new vscode.EventEmitter<ToHost>();
  /** Test-only: fires for every `test:*` message from any webview. */
  public readonly onTestMessage = this.testMessages.event;
  private readonly activeChanged = new vscode.EventEmitter<vscode.TextDocument | undefined>();
  /** Fires when the focused Remarked editor (or its presence) changes. */
  public readonly onDidChangeActiveDocument = this.activeChanged.event;
  private lastActiveDocument: vscode.TextDocument | undefined;
  private lastWarningAt = 0;
  // Focus/typewriter are deliberately provider-global (one toggle affects every
  // Remarked editor): they're a writing-session preference, not per-document state.
  private focusOn = false;
  private typewriterOn = false;
  private nextMermaidRequestId = 1;
  private readonly mermaidRequests = new Map<number, (svgs: (string | null)[]) => void>();

  /** The document of the currently active Remarked editor, if any. */
  public get activeDocument(): vscode.TextDocument | undefined {
    for (const [panel, session] of this.sessions) if (panel.active) return session.document;
    return undefined;
  }

  /** Test-only: post a message to the most recently resolved live webview. */
  public postToLatestWebview(msg: ToWebview): void {
    const panel = [...this.sessions.keys()].pop();
    void panel?.webview.postMessage(msg);
  }

  /** For the export pipeline (katex css lives under the extension's dist/). */
  public get extensionUri(): vscode.Uri {
    return this.context.extensionUri;
  }

  /** Post to the active editor's webview, falling back to the latest. */
  public postToActiveWebview(msg: ToWebview): void {
    for (const panel of this.sessions.keys()) {
      if (panel.active) {
        void panel.webview.postMessage(msg);
        return;
      }
    }
    this.postToLatestWebview(msg);
  }

  /** The live panel currently showing this document, if any. */
  public panelForDocument(document: vscode.TextDocument): vscode.WebviewPanel | undefined {
    for (const [panel, session] of this.sessions) if (session.document === document) return panel;
    return undefined;
  }

  /**
   * Ask the document's live webview to render mermaid sources to SVG.
   * Resolves with nulls on timeout or when no webview is available — the
   * export falls back to code blocks (degrade visibly, never hang).
   */
  public renderMermaidSvgs(
    document: vscode.TextDocument,
    sources: string[],
    timeoutMs = 10000
  ): Promise<(string | null)[]> {
    const panel = this.panelForDocument(document);
    if (sources.length === 0 || !panel) return Promise.resolve(sources.map(() => null));
    const requestId = this.nextMermaidRequestId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.mermaidRequests.delete(requestId);
        resolve(sources.map(() => null));
      }, timeoutMs);
      this.mermaidRequests.set(requestId, (svgs) => {
        clearTimeout(timer);
        resolve(svgs);
      });
      void panel.webview.postMessage({
        type: "export:renderMermaid",
        requestId,
        sources,
      } satisfies ToWebview);
    });
  }

  private fireActiveChanged(): void {
    const current = this.activeDocument;
    if (current === this.lastActiveDocument) return;
    this.lastActiveDocument = current;
    this.activeChanged.fire(current);
  }

  public toggleFocusMode(): void {
    this.focusOn = !this.focusOn;
    this.broadcast({ type: "setMode", focus: this.focusOn });
  }

  public toggleTypewriterMode(): void {
    this.typewriterOn = !this.typewriterOn;
    this.broadcast({ type: "setMode", typewriter: this.typewriterOn });
  }

  private broadcast(msg: ToWebview): void {
    for (const p of this.sessions.keys()) void p.webview.postMessage(msg);
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    const webview = webviewPanel.webview;
    const docDir = vscode.Uri.joinPath(document.uri, "..");
    const customCssFsPath = resolveCustomCssFsPath(
      vscode.workspace.getConfiguration("remarked").get<string>("customCss"),
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    );
    const customCssUri = customCssFsPath ? vscode.Uri.file(customCssFsPath) : undefined;
    webview.options = {
      enableScripts: true,
      // NOTE: docDir + workspace folders being resource roots makes workspace
      // .js files fetchable AND CSP-eligible as scripts (script-src cspSource).
      // Safe today: nothing injects script elements (mermaid SVG via innerHTML
      // can't execute scripts), but keep in mind when touching CSP or innerHTML.
      localResourceRoots: [
        this.context.extensionUri,
        docDir,
        ...(vscode.workspace.workspaceFolders ?? []).map((f) => f.uri),
        // The customCss dir widens what document content (e.g. absolute-path
        // image srcs) can LOAD; display-only today (CSP has no connect-src, so
        // no exfil path). Workspace-level customCss/imageFolder values are
        // additionally ignored in untrusted windows (capabilities.untrustedWorkspaces).
        ...(customCssUri ? [vscode.Uri.joinPath(customCssUri, "..")] : []),
      ],
    };
    const webviewDist = vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview");
    webview.html = renderWebviewHtml({
      cspSource: webview.cspSource,
      scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(webviewDist, "main.js")).toString(),
      styleUris: [
        webview.asWebviewUri(vscode.Uri.joinPath(webviewDist, "katex.min.css")).toString(),
        webview.asWebviewUri(vscode.Uri.joinPath(webviewDist, "codicon.css")).toString(),
        ...(customCssUri ? [webview.asWebviewUri(customCssUri).toString()] : []),
      ],
      nonce: makeNonce(),
    });
    this.sessions.set(webviewPanel, { document, renderAnyway: false });
    const viewStateSubscription = webviewPanel.onDidChangeViewState(() =>
      this.fireActiveChanged()
    );
    let disposed = false;

    // Highest webview edit version applied to (or acknowledged for) this editor.
    let lastAppliedVersion = 0;
    // Serializes edit application so concurrent edit messages can't interleave.
    let editQueue: Promise<void> = Promise.resolve();

    const sendSync = () => {
      if (disposed) return;
      const msg: ToWebview = {
        type: "sync",
        text: document.getText(),
        editVersion: lastAppliedVersion,
      };
      void webview.postMessage(msg);
    };

    const sendInit = () => {
      const cfg = vscode.workspace.getConfiguration("remarked");
      const init: ToWebview = {
        type: "init",
        text: document.getText(),
        docBaseUri: webview.asWebviewUri(docDir).toString(),
        // Lets the webview resolve absolute-path image srcs; meaningless on
        // Windows (drive letters), so send empty there (documented residual).
        rootBaseUri:
          process.platform === "win32" ? "" : webview.asWebviewUri(vscode.Uri.file("/")).toString(),
        settings: {
          math: cfg.get<boolean>("math.enabled", true),
          mermaid: cfg.get<boolean>("mermaid.enabled", true),
          toolbar: cfg.get<boolean>("toolbar.enabled", true),
        },
      };
      void webview.postMessage(init);
      if (this.focusOn || this.typewriterOn) {
        void webview.postMessage({
          type: "setMode",
          focus: this.focusOn,
          typewriter: this.typewriterOn,
        } satisfies ToWebview);
      }
    };

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document && e.contentChanges.length > 0) {
        sendSync();
      }
    });
    const messageSubscription = webview.onDidReceiveMessage((msg: ToHost) => {
      switch (msg.type) {
        case "ready": {
          // A (re)loaded webview resets its local version counter to 0, so a
          // fresh session must also reset our acknowledgement watermark —
          // otherwise stale-sync detection breaks until versions re-converge.
          lastAppliedVersion = 0;
          const session = this.sessions.get(webviewPanel);
          const limitMb = vscode.workspace.getConfiguration("remarked").get<number>("largeFileSizeMb", 2);
          const size = document.getText().length;
          if (session && !session.renderAnyway && size > limitMb * 1024 * 1024) {
            void webview.postMessage({ type: "largeFile", bytes: size } satisfies ToWebview);
            break;
          }
          sendInit();
          break;
        }
        case "edit":
          editQueue = editQueue
            .then(async () => {
              if (disposed) return;
              // Acknowledge before applying so the change-event sync carries the
              // new version; on rejection we still ack and force a resync, so the
              // webview reconciles to the host's authoritative text either way.
              lastAppliedVersion = msg.version;
              const applied = await this.applyChanges(document, msg.changes);
              if (!applied) {
                console.error("remarked: WorkspaceEdit was rejected; resyncing webview");
                if (Date.now() - this.lastWarningAt > 5000) {
                  this.lastWarningAt = Date.now();
                  void vscode.window.showWarningMessage(
                    "Remarked: an edit could not be applied; editor resynced."
                  );
                }
                sendSync();
              }
            })
            .catch((err) => {
              // A rejection must never poison the queue: log, resync, move on.
              console.error("remarked: edit apply failed", err);
              sendSync();
            });
          break;
        case "test:text":
          this.testMessages.fire(msg);
          break;
        case "openLink": {
          // Only open web links; anything else (file:, vscode:, javascript:)
          // from document content is refused.
          if (isOpenableHref(msg.href)) {
            vscode.env.openExternal(vscode.Uri.parse(msg.href)).then(undefined, (err) => {
              console.error("remarked: failed to open link", err);
            });
          }
          break;
        }
        case "renderAnyway": {
          const session = this.sessions.get(webviewPanel);
          if (session) session.renderAnyway = true;
          sendInit();
          break;
        }
        case "openAsText":
          void vscode.commands.executeCommand("vscode.openWith", document.uri, "default");
          break;
        case "showError":
          // Webview-originated user notification (our own code's errors).
          // String() guards against a non-string from a compromised renderer.
          void vscode.window.showErrorMessage(`Remarked: ${String(msg.message).slice(0, 200)}`);
          break;
        case "export:mermaidSvgs": {
          const resolve = this.mermaidRequests.get(msg.requestId);
          this.mermaidRequests.delete(msg.requestId);
          resolve?.(msg.svgs);
          break;
        }
        case "saveImage":
          void this.handleSaveImage(document, webviewPanel, msg);
          break;
      }
    });
    webviewPanel.onDidDispose(() => {
      disposed = true;
      this.sessions.delete(webviewPanel);
      changeSubscription.dispose();
      messageSubscription.dispose();
      viewStateSubscription.dispose();
      this.fireActiveChanged();
    });
    // A freshly created panel is usually already active; don't rely on the
    // onDidChangeViewState event timing for the first status-bar update.
    this.fireActiveChanged();
  }

  private async applyChanges(document: vscode.TextDocument, changes: Replacement[]): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    for (const c of changes) {
      edit.replace(
        document.uri,
        new vscode.Range(document.positionAt(c.from), document.positionAt(c.to)),
        c.insert
      );
    }
    return vscode.workspace.applyEdit(edit);
  }

  private async handleSaveImage(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    msg: Extract<ToHost, { type: "saveImage" }>
  ): Promise<void> {
    try {
      const folder = vscode.workspace.getConfiguration("remarked").get<string>("imageFolder", "assets");
      const relPath = await saveImageAsset({
        docUri: document.uri,
        folder,
        name: msg.name,
        mime: msg.mime,
        data: Buffer.from(msg.dataBase64, "base64"),
      });
      if (!this.sessions.has(webviewPanel)) return; // editor closed mid-save
      void webviewPanel.webview.postMessage({ type: "imageSaved", requestId: msg.requestId, relPath } satisfies ToWebview);
    } catch (err) {
      // Degrade visibly (spec): the file write failed or was refused — tell the
      // user AND release the webview's pending insertion.
      console.error("remarked: image save failed", err);
      void vscode.window.showErrorMessage(
        `Remarked: could not save the pasted image (${err instanceof Error ? err.message : String(err)})`
      );
      if (!this.sessions.has(webviewPanel)) return; // editor closed mid-save; skip the postMessage
      void webviewPanel.webview.postMessage({ type: "imageSaved", requestId: msg.requestId, relPath: null } satisfies ToWebview);
    }
  }
}
