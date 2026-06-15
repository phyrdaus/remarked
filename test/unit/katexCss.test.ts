import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { rewriteKatexCss } from "../../src/export/katexCss";

const SAMPLE = `@font-face{font-family:KaTeX_Main;src:url(fonts/KaTeX_Main-Regular.woff2) format('woff2'),url(fonts/KaTeX_Main-Regular.woff) format('woff'),url(fonts/KaTeX_Main-Regular.ttf) format('truetype');}
.katex{font:normal 1.21em KaTeX_Main}`;

describe("rewriteKatexCss", () => {
  it("inlines the woff2 as a data uri and drops the other formats", () => {
    const out = rewriteKatexCss(SAMPLE, (file) =>
      file === "KaTeX_Main-Regular.woff2" ? new Uint8Array([1, 2]) : null
    );
    expect(out).toContain("src:url(data:font/woff2;base64,AQI=) format('woff2');");
    expect(out).not.toContain("format('woff')");
    expect(out).not.toContain("truetype");
    expect(out).toContain(".katex{font:normal 1.21em KaTeX_Main}");
  });

  it("leaves the declaration alone when the font cannot be read", () => {
    const out = rewriteKatexCss(SAMPLE, () => null);
    expect(out).toContain("url(fonts/KaTeX_Main-Regular.woff2)");
  });

  it("preserves block boundaries in minified css (no semicolon before })", () => {
    const minified =
      `@font-face{font-display:block;font-family:KaTeX_AMS;src:url(fonts/KaTeX_AMS-Regular.woff2) format("woff2"),url(fonts/KaTeX_AMS-Regular.woff) format("woff")}@font-face{font-display:block;font-family:KaTeX_Main;src:url(fonts/KaTeX_Main-Regular.woff2) format("woff2")}.katex{font-size:1.21em}`;
    const out = rewriteKatexCss(minified, () => new Uint8Array([3]));
    expect(out.match(/@font-face/g)).toHaveLength(2); // block boundaries intact
    expect(out).toContain('format(\'woff2\')}@font-face');
    expect(out).toContain("font-display:block;font-family:KaTeX_Main");
    expect(out).toContain(".katex{font-size:1.21em}");
  });

  it("handles the real katex.min.css without destroying structure", () => {
    const real = readFileSync("node_modules/katex/dist/katex.min.css", "utf8");
    const blocksBefore = real.match(/@font-face/g)?.length ?? 0;
    const out = rewriteKatexCss(real, () => new Uint8Array([1]));
    expect(out.match(/@font-face/g)).toHaveLength(blocksBefore);
    expect(out).not.toContain("url(fonts/");
  });
});
