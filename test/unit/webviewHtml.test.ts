import { describe, it, expect } from "vitest";
import { makeNonce, renderWebviewHtml, escapeAttr } from "../../src/editor/webviewHtml";

describe("renderWebviewHtml", () => {
  const html = renderWebviewHtml({
    cspSource: "vscode-resource://csp",
    scriptUri: "vscode-resource://ext/dist/webview/main.js",
    styleUris: ["vscode-resource://ext/dist/webview/katex.min.css"],
    nonce: "NONCE123",
  });

  it("locks default-src to none", () => {
    expect(html).toContain("default-src 'none'");
  });

  it("only allows scripts with the nonce, as an ES module", () => {
    expect(html).toContain("'nonce-NONCE123'");
    expect(html).toContain(
      '<script type="module" nonce="NONCE123" src="vscode-resource://ext/dist/webview/main.js">'
    );
  });

  it("allows inline styles (CodeMirror injects them) and csp-source styles", () => {
    expect(html).toContain("style-src vscode-resource://csp 'unsafe-inline'");
  });

  it("has the editor mount point", () => {
    expect(html).toContain('<div id="editor"></div>');
  });

  it("links provided stylesheets", () => {
    expect(html).toContain(
      '<link rel="stylesheet" href="vscode-resource://ext/dist/webview/katex.min.css">'
    );
  });

  it("freezes the exact CSP policy", () => {
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src vscode-resource://csp 'unsafe-inline'; script-src vscode-resource://csp 'nonce-NONCE123'; img-src vscode-resource://csp https: data:; font-src vscode-resource://csp;">`
    );
  });
});

describe("makeNonce", () => {
  it("produces unique, sufficiently long nonces", () => {
    const a = makeNonce();
    const b = makeNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(22); // 16 random bytes base64-encoded
  });
});

describe("escapeAttr", () => {
  it("escapes quote and ampersand for attribute interpolation", () => {
    expect(escapeAttr(`a"b&c<d`)).toBe("a&quot;b&amp;c&lt;d");
  });
  it("leaves normal uris untouched", () => {
    expect(escapeAttr("https://x/y.css?z=1")).toBe("https://x/y.css?z=1");
  });
});

describe("renderWebviewHtml toolbar wiring", () => {
  it("links every provided stylesheet (incl. codicon.css)", () => {
    const html = renderWebviewHtml({
      cspSource: "vscode-resource:",
      scriptUri: "main.js",
      styleUris: ["katex.min.css", "codicon.css"],
      nonce: "n0",
    });
    expect(html).toContain("codicon.css");
    expect(html).toContain("katex.min.css");
  });
  it("lays the body out as a flex column with toolbar styles", () => {
    const html = renderWebviewHtml({ cspSource: "x", scriptUri: "main.js", nonce: "n0" });
    expect(html).toContain("flex-direction: column");
    expect(html).toContain(".rm-toolbar");
  });
  it("allows fonts from the webview source (for codicon.ttf)", () => {
    const html = renderWebviewHtml({ cspSource: "vscode-resource:", scriptUri: "main.js", nonce: "n0" });
    expect(html).toMatch(/font-src vscode-resource:/);
  });
});
