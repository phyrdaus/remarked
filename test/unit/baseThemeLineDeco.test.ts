import { describe, it, expect } from "vitest";
import { baseThemeSpec } from "../../src/webview/render/baseTheme";

/**
 * FIR-83: clicks landed on the wrong line because heading line decorations used
 * CSS `margin`. CodeMirror's height map measures each line's box, which excludes
 * (and collapses) margins — so a margin on a line element desyncs click→position
 * mapping from the rendered layout, and the error accumulates per decorated line
 * above the click. These classes are applied via `Decoration.line(...)` in
 * buildDecorations.ts and must use `padding` (inside the measured box) for
 * vertical spacing, never `margin`.
 */
const LINE_DECORATION_CLASSES = [
  "cm-rm-heading",
  "cm-rm-h1", "cm-rm-h2", "cm-rm-h3", "cm-rm-h4", "cm-rm-h5", "cm-rm-h6",
  "cm-rm-task-done",
  "cm-rm-codeblock",
  "cm-rm-quote",
];

const isMarginProp = (k: string) => /^margin/i.test(k);

describe("baseTheme line decorations (FIR-83)", () => {
  for (const cls of LINE_DECORATION_CLASSES) {
    it(`.${cls} sets no margin (margins desync CodeMirror's height map)`, () => {
      for (const [selector, style] of Object.entries(baseThemeSpec)) {
        if (!new RegExp(`\\.${cls}\\b`).test(selector)) continue;
        const margins = Object.keys(style).filter(isMarginProp);
        expect(margins, `${selector} sets ${margins.join(", ")}`).toEqual([]);
      }
    });
  }

  it("headings space themselves with padding, not margin (the fix)", () => {
    expect(baseThemeSpec[".cm-rm-h1"].padding).toBeTruthy();
    expect(baseThemeSpec[".cm-rm-h2"].padding).toBeTruthy();
    expect(baseThemeSpec[".cm-rm-h1"].margin).toBeUndefined();
    expect(baseThemeSpec[".cm-rm-h2"].margin).toBeUndefined();
  });
});
