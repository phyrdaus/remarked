import { describe, it, expect } from "vitest";
import { renderPreviewHtml } from "../../src/preview/previewHtml";

describe("renderPreviewHtml", () => {
  const base = { cspSource: "vscode-webview:", scriptUri: "vscode-webview://x/preview.js", nonce: "N0nce" };

  it("embeds the nonce on the module script", () => {
    const html = renderPreviewHtml(base);
    expect(html).toContain('type="module" nonce="N0nce" src="vscode-webview://x/preview.js"');
  });

  it("declares a strict CSP with the nonce and cspSource", () => {
    const html = renderPreviewHtml(base);
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src vscode-webview: 'nonce-N0nce'");
  });

  it("inlines EXPORT_CSS and applies the rm-export body class", () => {
    const html = renderPreviewHtml(base);
    expect(html).toContain("body.rm-export");
    expect(html).toContain('<body class="rm-export">');
    expect(html).toContain('id="preview"');
  });

  it("links each style uri", () => {
    const html = renderPreviewHtml({ ...base, styleUris: ["vscode-webview://x/katex.min.css"] });
    expect(html).toContain('<link rel="stylesheet" href="vscode-webview://x/katex.min.css">');
  });
});
