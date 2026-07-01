import { describe, it, expect, vi } from "vitest";

const { renderMermaid } = vi.hoisted(() => ({ renderMermaid: vi.fn() }));
vi.mock("../../src/webview/render/mermaid", () => ({ renderMermaid }));

import { applyRender } from "../../src/webview/preview/main";

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

  it("preserves scrollTop across a re-render", () => {
    const c = document.createElement("div");
    Object.defineProperty(c, "scrollTop", { value: 0, writable: true });
    c.scrollTop = 42;
    applyRender(c, "<p>x</p>", []);
    expect(c.scrollTop).toBe(42);
  });
});
