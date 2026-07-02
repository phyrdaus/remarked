import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../src/export/renderMarkdown";

describe("renderMarkdown sourceMap (FIR-82)", () => {
  const doc = "# Title\n\npara one\n\n- item a\n- item b\n";

  it("stamps data-line on block anchors when sourceMap is on (0-based)", () => {
    const { html } = renderMarkdown(doc, { sourceMap: true });
    expect(html).toContain('<h1 data-line="0"');
    expect(html).toContain('<p data-line="2"');
    expect(html).toContain('data-line="4"'); // list opens at line 4
  });

  it("emits no data-line by default (export stays clean)", () => {
    const { html } = renderMarkdown(doc);
    expect(html).not.toContain("data-line");
  });

  it("stamps data-line on a math block when sourceMap is on", () => {
    const { html } = renderMarkdown("$$\na=b\n$$\n", { sourceMap: true });
    expect(html).toMatch(/<div class="rm-math-block" data-line="0"/);
  });
});
