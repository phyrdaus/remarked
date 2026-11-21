import { describe, it, expect } from "vitest";
import { renderPreviewHtml } from "../../src/preview/previewHtml";
import { EXPORT_CSS } from "../../src/export/exportCss";

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

// The preview's sanitizer strips untrusted hrefs (vscode:, etc.), leaving a
// bare <a>. It must read as plain text, not as a dead link.
describe("EXPORT_CSS: links whose href was stripped", () => {
  const LIGHT_BODY = "rgb(36, 41, 47)"; // #24292f
  const DARK_BODY = "rgb(212, 217, 225)"; // #d4d9e1
  // jsdom always reports the light colour scheme, so for dark mode lift the
  // real prefers-color-scheme: dark block out of EXPORT_CSS as plain rules.
  const DARK_RULES = /@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}/.exec(EXPORT_CSS)?.[1];

  function page(opts: { dark?: boolean; extraCssBefore?: string } = {}) {
    if (opts.dark && !DARK_RULES) throw new Error("dark-mode block not found in EXPORT_CSS");
    document.head.innerHTML =
      (opts.extraCssBefore ? `<style>${opts.extraCssBefore}</style>` : "") +
      `<style>${EXPORT_CSS}</style>` +
      (opts.dark ? `<style>${DARK_RULES}</style>` : "");
    document.body.className = "rm-export";
    document.body.innerHTML =
      '<p><a id="dead">dead <code id="dead-code">cmd</code></a> <a id="live" href="https://example.com">live</a>' +
      ' <code id="plain-code">plain</code></p>' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<a id="svg-link" xlink:href="https://example.com"><text>node</text></a></svg>';
  }
  const style = (id: string) => getComputedStyle(document.getElementById(id)!);

  it("shows a bare <a> in the body colour and real links in link blue (light)", () => {
    page();
    expect(style("dead").color).toBe(LIGHT_BODY);
    expect(style("live").color).toBe("rgb(77, 124, 193)"); // #4d7cc1
    // No --vscode-* variables here (as outside VS Code): code falls back to inheriting.
    expect(style("dead-code").color).toBe(LIGHT_BODY);
  });

  it("does the same with the real dark-mode rules applied", () => {
    page({ dark: true });
    expect(getComputedStyle(document.body).color).toBe(DARK_BODY);
    expect(style("dead").color).toBe(DARK_BODY);
    expect(style("live").color).toBe("rgb(122, 163, 212)"); // #7aa3d4
  });

  // VS Code prepends a built-in webview stylesheet (unlayered up to 1.103, in
  // @layer vscode-default from 1.104). It is simulated here unlayered, the
  // worst case: it wins wherever it is more specific. It changed across the
  // supported range (^1.101):
  //   <=1.144: `a, a code` take the LINK colour
  //   >=1.145: `a code` takes the code colour and is underlined
  // and 1.101-1.103 underline `p > a` when accessibility.underlineLinks is on.
  const VSCODE_VARS =
    ":root { --vscode-textPreformat-foreground: rgb(200, 100, 0); --vscode-textLink-foreground: rgb(0, 0, 200); }";
  const VSCODE_STYLES = {
    "VS Code <=1.144": "code { color: var(--vscode-textPreformat-foreground); } a, a code { color: var(--vscode-textLink-foreground); }",
    "VS Code >=1.145":
      "code { color: var(--vscode-textPreformat-foreground); } a code { color: var(--vscode-textPreformat-foreground); text-decoration: underline; }",
  };

  it.each(Object.entries(VSCODE_STYLES))(
    "makes inline code inside a bare <a> look like other inline code (%s)",
    (_name, css) => {
      page({ extraCssBefore: VSCODE_VARS + css });
      expect(style("plain-code").color).toBe("rgb(200, 100, 0)");
      expect(style("dead-code").color).toBe(style("plain-code").color);
      expect(style("dead-code").textDecorationLine).toBe("none");
    }
  );

  it("keeps a bare <a> un-underlined when VS Code underlines paragraph links (1.101-1.103)", () => {
    page({ extraCssBefore: "p > a { text-decoration: underline; }" });
    expect(style("dead").textDecorationLine).toBe("none");
  });

  // Mermaid writes SVG links as xlink:href, which [href] doesn't match; they
  // are real links and must keep the link colour.
  it("leaves mermaid's SVG <a xlink:href> links alone", () => {
    page();
    expect(style("svg-link").color).toBe("rgb(77, 124, 193)");
  });
});
