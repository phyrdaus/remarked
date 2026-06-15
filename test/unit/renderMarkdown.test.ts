import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../src/export/renderMarkdown";

describe("renderMarkdown — core", () => {
  it("renders GFM essentials", () => {
    const { html } = renderMarkdown(
      "# Title\n\n**bold** *em* ~~gone~~ `code`\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n"
    );
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<s>gone</s>");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>2</td>");
  });

  it("extracts the first h1 as the title", () => {
    expect(renderMarkdown("intro\n\n# The Title\n\n# Second\n").title).toBe("The Title");
    expect(renderMarkdown("no headings here\n").title).toBeNull();
  });

  it("escapes raw HTML islands instead of passing them through", () => {
    const { html } = renderMarkdown("hello <script>alert(1)</script> world\n");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders task lists as disabled checkboxes", () => {
    const { html } = renderMarkdown("- [ ] open\n- [x] done\n");
    expect(html).toContain('<input type="checkbox" disabled> open');
    expect(html).toContain('<input type="checkbox" disabled checked> done');
  });
});

describe("renderMarkdown — math", () => {
  it("renders inline and block math through KaTeX", () => {
    const { html } = renderMarkdown("a $x^2$ b\n\n$$\nE=mc^2\n$$\n");
    expect(html).toContain("katex");
    expect(html).toContain('class="rm-math-block"');
  });

  it("leaves prices as plain text (editor guard parity)", () => {
    const { html } = renderMarkdown("costs $5 and $6 total\n");
    expect(html).not.toContain("katex");
    expect(html).toContain("$5 and $6");
  });

  it("single-line $$x$$ blocks work", () => {
    const { html } = renderMarkdown("$$E=mc^2$$\n");
    expect(html).toContain('class="rm-math-block"');
  });
});

describe("renderMarkdown — mermaid and images", () => {
  it("replaces mermaid fences with indexed slots and collects sources", () => {
    const { html, mermaidSources } = renderMarkdown(
      "```mermaid\ngraph TD; A-->B\n```\n\n```mermaid\npie\n```\n"
    );
    expect(mermaidSources).toEqual(["graph TD; A-->B\n", "pie\n"]);
    expect(html).toContain('<div class="rm-mermaid-slot" data-mermaid="0"></div>');
    expect(html).toContain('<div class="rm-mermaid-slot" data-mermaid="1"></div>');
  });

  it("leaves normal fences as escaped code blocks", () => {
    const { html } = renderMarkdown("```js\nconst x = 1 < 2;\n```\n");
    expect(html).toContain('<code class="language-js">');
    expect(html).toContain("1 &lt; 2");
  });

  it("collects local image srcs but not remote or data ones", () => {
    const { imageSrcs, html } = renderMarkdown(
      "![a](pic.png) ![b](https://x/y.png) ![c](data:image/png;base64,xx) ![d](<my pic.png>)\n"
    );
    // markdown-it percent-encodes destinations; imageSrcs must match the
    // rendered attr exactly (replaceImageSrcs keys on it). File reads decode.
    expect(imageSrcs).toEqual(["pic.png", "my%20pic.png"]);
    expect(html).toContain('<img src="pic.png" alt="a">');
  });
});
