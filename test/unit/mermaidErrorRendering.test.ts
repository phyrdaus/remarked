import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderMermaid, renderMermaidSvg } from "../../src/webview/render/mermaid";

// Real mermaid, not mocked. On a parse error mermaid draws its own "Syntax
// error" graphic into a temporary <div> on <body> and throws before removing
// it, unless suppressErrorRendering is set. Remarked shows its own error chip,
// so nothing of mermaid's may be left behind.
const BROKEN = "flowchart LR\n  A -->";

describe("mermaid parse errors", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("export: returns null and leaves nothing on <body>", async () => {
    expect(await renderMermaidSvg(BROKEN)).toBeNull();
    expect(document.body.innerHTML).toBe("");
  });

  it("editor: shows the error chip and leaves nothing else on <body>", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderMermaid(BROKEN, container);
    await vi.waitFor(() => expect(container.classList.contains("cm-rm-mermaid-error")).toBe(true));
    expect(container.textContent).toMatch(/^⚠ mermaid: /);
    expect([...document.body.children]).toEqual([container]);
  });

  it("editor: the chip shows the reason, the source snippet, and the full message on hover", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderMermaid(BROKEN, container);
    await vi.waitFor(() => expect(container.classList.contains("cm-rm-mermaid-error")).toBe(true));
    expect(container.querySelector(".cm-rm-mermaid-error-summary")?.textContent).toBe(
      "⚠ mermaid: Parse error on line 3, unexpected end of diagram"
    );
    expect(container.querySelector(".cm-rm-mermaid-error-snippet")?.textContent).toMatch(/A -->\n-+\^$/);
    expect(container.title).toMatch(/^Parse error on line 3:\n[\s\S]*got 'EOF'$/);
  });
});
