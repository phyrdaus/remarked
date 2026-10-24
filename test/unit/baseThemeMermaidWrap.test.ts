import { describe, it, expect } from "vitest";
import { baseThemeSpec } from "../../src/webview/render/baseTheme";

/**
 * Mermaid measures each label in a temporary element on <body>, then the
 * diagram is shown inside the editor, where EditorView.lineWrapping sets
 * `overflow-wrap: anywhere` (plus `word-break: break-word`, `white-space:
 * break-spaces`). That lets the browser break *inside* a word, so a label a
 * fraction of a pixel wider than mermaid measured loses its last character to
 * a hidden second line ("buildDecorations" rendered as "buildDecoration" under
 * mermaid 12). The diagram container must reset wrapping to normal so labels
 * lay out the way mermaid measured them. jsdom has no layout, so this pins the
 * style; the bug itself was reproduced in Chromium.
 */
describe("baseTheme mermaid container", () => {
  it("resets CodeMirror's line wrapping so diagram labels aren't broken mid-word", () => {
    expect(baseThemeSpec[".cm-rm-mermaid"]).toMatchObject({
      whiteSpace: "normal",
      wordBreak: "normal",
      overflowWrap: "normal",
    });
  });
});
