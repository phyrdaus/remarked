import { describe, it, expect, vi } from "vitest";

const { renderMermaid } = vi.hoisted(() => ({ renderMermaid: vi.fn() }));
vi.mock("../../src/webview/render/mermaid", () => ({ renderMermaid }));

import { applyRender } from "../../src/webview/preview/main";
import { renderMarkdown } from "../../src/export/renderMarkdown";

describe("applyRender", () => {
  it("injects html into the container", () => {
    const c = document.createElement("div");
    applyRender(c, "<h1>Hi</h1>", []);
    expect(c.querySelector("h1")?.textContent).toBe("Hi");
  });

  it("renders each mermaid slot with its source", () => {
    renderMermaid.mockClear();
    const c = document.createElement("div");
    applyRender(
      c,
      '<div class="rm-mermaid-slot" data-mermaid="0"></div><div class="rm-mermaid-slot" data-mermaid="1"></div>',
      ["graph A", "graph B"]
    );
    expect(renderMermaid).toHaveBeenCalledTimes(2);
    expect(renderMermaid).toHaveBeenNthCalledWith(1, "graph A", expect.any(HTMLElement));
    expect(renderMermaid).toHaveBeenNthCalledWith(2, "graph B", expect.any(HTMLElement));
  });

  // Defense in depth: renderMarkdown escapes raw HTML (html:false), but the
  // preview must not depend on that alone — sanitize at the innerHTML sink.
  it("strips event-handler attributes from injected html", () => {
    const c = document.createElement("div");
    applyRender(c, '<img src="x.png" onerror="alert(1)"><a href="javascript:alert(1)">x</a>', []);
    expect(c.querySelector("img")?.hasAttribute("onerror")).toBe(false);
    expect(c.querySelector("a")?.getAttribute("href") ?? "").not.toMatch(/javascript:/i);
  });

  it("keeps the preview's own markup: data-line anchors, task checkboxes, mermaid slots", () => {
    renderMermaid.mockClear();
    const { html, mermaidSources } = renderMarkdown(
      "# Title\n\n- [x] done\n\n```mermaid\ngraph TD; A-->B\n```\n",
      { sourceMap: true }
    );
    const c = document.createElement("div");
    applyRender(c, html, mermaidSources);
    expect(c.querySelector("h1")?.getAttribute("data-line")).toBe("0");
    const box = c.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(box?.checked).toBe(true);
    expect(box?.disabled).toBe(true);
    expect(renderMermaid).toHaveBeenCalledWith("graph TD; A-->B\n", expect.any(HTMLElement));
  });

  // DOMPurify strips MathML <semantics>/<annotation> (mXSS vectors). Without
  // dropping the annotation's content too, KaTeX's TeX source is left as stray
  // text inside <math>, which screen readers would read after the formula.
  it("does not leave KaTeX's TeX source as text inside the MathML", () => {
    const { html } = renderMarkdown("$x^2 + \\frac{a}{b}$");
    const c = document.createElement("div");
    applyRender(c, html, []);
    const math = c.querySelector("math");
    expect(math).not.toBeNull();
    expect(math?.textContent).not.toContain("\\frac");
  });

  it("preserves scrollTop across a re-render", () => {
    const c = document.createElement("div");
    Object.defineProperty(c, "scrollTop", { value: 0, writable: true });
    c.scrollTop = 42;
    applyRender(c, "<p>x</p>", []);
    expect(c.scrollTop).toBe(42);
  });
});
