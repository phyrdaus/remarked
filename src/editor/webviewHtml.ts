// Extension-host only — must never be imported from src/webview/ (the browser bundle).
import { randomBytes } from "node:crypto";

export interface WebviewHtmlOptions {
  cspSource: string;
  scriptUri: string;
  styleUris?: string[];
  nonce: string;
}

/** Minimal attribute escaping — Uri.toString() percent-encodes quotes today,
 *  but the safety must not depend on that encoding detail. */
export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function renderWebviewHtml(opts: WebviewHtmlOptions): string {
  const { cspSource, scriptUri, styleUris = [], nonce } = opts;
  const links = styleUris.map((u) => `<link rel="stylesheet" href="${escapeAttr(u)}">`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}'; img-src ${cspSource} https: data:; font-src ${cspSource};">
${links}
<style>
  html, body { height: 100%; margin: 0; padding: 0; }
  body { display: flex; flex-direction: column; }
  #editor { flex: 1 1 auto; min-height: 0; }
  .cm-editor { height: 100%; }
  .rm-toolbar { display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
    padding: 5px 8px; border-bottom: 1px solid var(--vscode-panel-border, #3a3a3a);
    background: var(--vscode-editor-background, #1e1e1e); flex: 0 0 auto; }
  .rm-toolbar button { min-width: 28px; height: 28px; padding: 0 6px; border: none;
    border-radius: 5px; background: transparent; color: var(--vscode-foreground, #ccc);
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    font: inherit; }
  .rm-toolbar button:hover { background: var(--vscode-toolbar-hoverBackground, #ffffff14); }
  .rm-toolbar button.on { background: var(--vscode-inputOption-activeBackground, #0e639c);
    color: var(--vscode-inputOption-activeForeground, #fff); }
  .rm-toolbar .rm-toolbar-text { font-weight: 600; }
  .rm-toolbar [data-action="italic"].rm-toolbar-text { font-style: italic; }
  .rm-toolbar [data-action="strike"].rm-toolbar-text { text-decoration: line-through; }
  .rm-toolbar-sep { width: 1px; height: 18px; margin: 0 4px;
    background: var(--vscode-panel-border, #3a3a3a); }
  .rm-largefile { max-width: 32em; margin: 20vh auto 0; text-align: center; font-family: system-ui, sans-serif; color: var(--vscode-foreground, #ccc); }
  .rm-largefile button { margin: 0.5em 0.4em 0; padding: 0.4em 1.1em; cursor: pointer; }
</style>
</head>
<body>
<div id="editor"></div>
<script type="module" nonce="${nonce}" src="${escapeAttr(scriptUri)}"></script>
</body>
</html>`;
}

export function makeNonce(): string {
  return randomBytes(16).toString("base64");
}
