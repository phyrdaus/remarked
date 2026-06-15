import { describe, it, expect } from "vitest";
import {
  assembleHtml,
  replaceImageSrcs,
  fillMermaidSlots,
  escapeHtml,
} from "../../src/export/assembleHtml";

describe("assembleHtml", () => {
  it("produces a complete standalone document", () => {
    const html = assembleHtml({
      title: 'My "Doc" <1>',
      bodyHtml: "<p>hi</p>",
      css: "body{margin:0}",
    });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<title>My &quot;Doc&quot; &lt;1&gt;</title>");
    expect(html).toContain("<style>body{margin:0}</style>");
    expect(html).toContain("<p>hi</p>");
  });

  it("includes extra css blocks when given", () => {
    const html = assembleHtml({ title: "t", bodyHtml: "", css: "a{}", extraCss: ["b{}"] });
    expect(html).toContain("<style>b{}</style>");
  });
});

describe("replaceImageSrcs", () => {
  it("replaces mapped srcs and leaves others", () => {
    const html = '<img src="pic.png" alt="a"> <img src="keep.png" alt="b">';
    const out = replaceImageSrcs(html, new Map([["pic.png", "data:image/png;base64,AA"]]));
    expect(out).toContain('src="data:image/png;base64,AA"');
    expect(out).toContain('src="keep.png"');
  });

  it("matches attr-escaped srcs (markdown-it escapes & in attributes)", () => {
    const html = '<img src="a&amp;b.png" alt="">';
    const out = replaceImageSrcs(html, new Map([["a&b.png", "X"]]));
    expect(out).toContain('src="X"');
  });
});

describe("fillMermaidSlots", () => {
  it("replaces slots with svgs and falls back to code blocks", () => {
    const html =
      '<div class="rm-mermaid-slot" data-mermaid="0"></div><div class="rm-mermaid-slot" data-mermaid="1"></div>';
    const out = fillMermaidSlots(html, ["graph TD;", "pie <bad>"], ["<svg>ok</svg>", null]);
    expect(out).toContain('<div class="rm-mermaid"><svg>ok</svg></div>');
    expect(out).toContain('<pre><code class="language-mermaid">pie &lt;bad&gt;</code></pre>');
  });
});

describe("escapeHtml", () => {
  it("escapes the four html-significant characters", () => {
    expect(escapeHtml(`<a href="x">&`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });
});
