import { describe, it, expect, vi } from "vitest";
import { renderPreviewBody } from "../../src/preview/renderPreviewBody";

describe("renderPreviewBody", () => {
  it("keeps math as static KaTeX HTML", () => {
    const { html } = renderPreviewBody("$x^2$\n", () => null);
    expect(html).toContain("katex");
    expect(html).not.toContain("$x^2$");
  });

  it("returns mermaid sources and leaves slots in the html", () => {
    const { html, mermaidSources } = renderPreviewBody("```mermaid\ngraph TD;A-->B;\n```\n", () => null);
    expect(mermaidSources).toEqual(["graph TD;A-->B;\n"]);
    expect(html).toContain('class="rm-mermaid-slot" data-mermaid="0"');
  });

  it("rewrites local image srcs via toWebviewUri", () => {
    const map = vi.fn((src: string) => `vscode-webview://x/${src}`);
    const { html } = renderPreviewBody("![a](img/p.png)\n", map);
    expect(map).toHaveBeenCalledWith("img/p.png");
    expect(html).toContain("vscode-webview://x/img/p.png");
  });

  it("does not touch http/data image srcs", () => {
    const map = vi.fn(() => "SHOULD_NOT_BE_USED");
    const { html } = renderPreviewBody("![a](https://e/i.png)\n![b](data:image/png;base64,AA)\n", map);
    expect(map).not.toHaveBeenCalled();
    expect(html).toContain("https://e/i.png");
  });

  it("returns the first h1 as title", () => {
    expect(renderPreviewBody("# Hi\n", () => null).title).toBe("Hi");
  });
});
