// Extension-host only — never import from src/webview/. HTML shell for the
// live Preview panel: injects EXPORT_CSS + KaTeX/custom CSS, hosts #preview.
import { EXPORT_CSS } from "../export/exportCss";
import { escapeAttr } from "../editor/webviewHtml";

export interface PreviewHtmlOptions {
  cspSource: string;
  scriptUri: string;
  styleUris?: string[];
  nonce: string;
}

export function renderPreviewHtml(opts: PreviewHtmlOptions): string {
  const { cspSource, scriptUri, styleUris = [], nonce } = opts;
  const links = styleUris.map((u) => `<link rel="stylesheet" href="${escapeAttr(u)}">`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}'; img-src ${cspSource} https: data:; font-src ${cspSource};">
${links}
<style>${EXPORT_CSS}</style>
<style>
  html, body { height: 100%; margin: 0; }
  #preview { height: 100%; overflow: auto; padding: 1.2rem 1.6rem; box-sizing: border-box; }
</style>
</head>
<body class="rm-export">
<div id="preview"></div>
<script type="module" nonce="${nonce}" src="${escapeAttr(scriptUri)}"></script>
</body>
</html>`;
}
