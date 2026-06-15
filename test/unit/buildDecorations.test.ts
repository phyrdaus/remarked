import { describe, it, expect, afterEach } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import { setDocBaseUri } from "../../src/webview/render/imageBase";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { buildDecorations } from "../../src/webview/render/buildDecorations";
import { mathExtension } from "../../src/webview/render/mathExtension";
import { setRenderSettings } from "../../src/webview/render/settings";

export function makeState(doc: string, cursor = doc.length): EditorState {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.single(cursor),
    extensions: [markdown({ base: markdownLanguage, extensions: [mathExtension] })],
  });
  ensureSyntaxTree(state, doc.length, 5000); // force a full parse for deterministic tests
  return state;
}

/** Flatten a DecorationSet into comparable {from,to,kind} tuples. */
export function summarize(state: EditorState): Array<{ from: number; to: number; kind: string }> {
  const out: Array<{ from: number; to: number; kind: string }> = [];
  const set = buildDecorations(state);
  const iter = set.iter();
  while (iter.value) {
    const spec = (iter.value as unknown as { spec: { class?: string; widget?: unknown } }).spec;
    const kind = spec.class ?? (spec.widget ? "widget" : "hide");
    out.push({ from: iter.from, to: iter.to, kind });
    iter.next();
  }
  return out;
}

describe("buildDecorations — inline", () => {
  it("hides bold markers and styles content when the caret is outside", () => {
    // doc: "a **bold** b", caret at 0
    const d = summarize(makeState("a **bold** b", 0));
    expect(d).toContainEqual({ from: 2, to: 4, kind: "hide" });
    expect(d).toContainEqual({ from: 8, to: 10, kind: "hide" });
    expect(d).toContainEqual({ from: 4, to: 8, kind: "cm-rm-strong" });
  });

  it("reveals bold markers (styled, not hidden) when the caret is inside", () => {
    const d = summarize(makeState("a **bold** b", 5));
    expect(d.filter((x) => x.kind === "hide")).toEqual([]);
    expect(d).toContainEqual({ from: 4, to: 8, kind: "cm-rm-strong" });
    expect(d).toContainEqual({ from: 2, to: 4, kind: "cm-rm-marker" });
    expect(d).toContainEqual({ from: 8, to: 10, kind: "cm-rm-marker" });
  });

  it("handles italic and strikethrough", () => {
    const d = summarize(makeState("*i* and ~~s~~", 13));
    // careted inside strikethrough end -> strike revealed, italic hidden
    expect(d).toContainEqual({ from: 0, to: 1, kind: "hide" });
    expect(d).toContainEqual({ from: 1, to: 2, kind: "cm-rm-em" });
    expect(d.some((x) => x.kind === "cm-rm-strike")).toBe(true);
  });

  it("styles inline code and hides backticks when caret outside", () => {
    const d = summarize(makeState("run `ls -la` now", 0));
    expect(d).toContainEqual({ from: 4, to: 5, kind: "hide" });
    expect(d).toContainEqual({ from: 11, to: 12, kind: "hide" });
    expect(d).toContainEqual({ from: 5, to: 11, kind: "cm-rm-inline-code" });
  });

  it("nested bold inside italic decorates both", () => {
    const d = summarize(makeState("*a **b** c*", 11));
    expect(d.some((x) => x.kind === "cm-rm-em")).toBe(true);
    expect(d.some((x) => x.kind === "cm-rm-strong")).toBe(true);
  });
});

describe("buildDecorations — blocks", () => {
  it("styles a heading line and hides '# ' when the caret is on another line", () => {
    const d = summarize(makeState("# Title\n\ntext", 10));
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-heading cm-rm-h1" });
    expect(d).toContainEqual({ from: 0, to: 2, kind: "hide" }); // "# " incl. trailing space
  });

  it("reveals the heading marker when the caret is on the heading line", () => {
    const d = summarize(makeState("# Title\n\ntext", 3));
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-heading cm-rm-h1" });
    expect(d).toContainEqual({ from: 0, to: 1, kind: "cm-rm-marker" });
    expect(d.filter((x) => x.kind === "hide")).toEqual([]);
  });

  it("levels h2 and h3 get their own classes", () => {
    const d = summarize(makeState("## Two\n\n### Three", 0));
    expect(d.some((x) => x.kind === "cm-rm-heading cm-rm-h2")).toBe(true);
    expect(d.some((x) => x.kind === "cm-rm-heading cm-rm-h3")).toBe(true);
  });

  it("styles blockquote lines and hides '> ' markers when not revealed", () => {
    const d = summarize(makeState("> quoted\n\nafter", 12));
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-quote" });
    expect(d).toContainEqual({ from: 0, to: 2, kind: "hide" });
  });

  it("replaces '- ' bullets with a widget when not revealed", () => {
    const d = summarize(makeState("- item one\n- item two", 0));
    // caret on line 1 -> its bullet revealed as marker, line 2's bullet replaced by widget
    expect(d).toContainEqual({ from: 0, to: 1, kind: "cm-rm-marker" });
    expect(d).toContainEqual({ from: 11, to: 12, kind: "widget" });
  });

  it("keeps ordered-list numbers visible but styled", () => {
    const d = summarize(makeState("1. first\n2. second", 0));
    expect(d).toContainEqual({ from: 9, to: 11, kind: "cm-rm-bullet" });
  });

  it("renders a horizontal rule as a widget when not revealed", () => {
    const d = summarize(makeState("a\n\n---\n\nb", 0));
    expect(d).toContainEqual({ from: 3, to: 6, kind: "widget" });
  });

  it("hides QuoteMarks on every line of a multi-line blockquote", () => {
    const d = summarize(makeState("> a\n> b\n\nzzz", 11));
    expect(d).toContainEqual({ from: 0, to: 2, kind: "hide" });
    expect(d).toContainEqual({ from: 4, to: 6, kind: "hide" });
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-quote" });
    expect(d).toContainEqual({ from: 4, to: 4, kind: "cm-rm-quote" });
  });
});

describe("buildDecorations — links", () => {
  it("hides brackets and URL, styles link text, when caret is outside", () => {
    // doc: "see [docs](https://x.y) ok" — caret at 0
    const d = summarize(makeState("see [docs](https://x.y) ok", 0));
    expect(d).toContainEqual({ from: 4, to: 5, kind: "hide" }); // [
    expect(d).toContainEqual({ from: 5, to: 9, kind: "cm-rm-link" }); // docs
    expect(d).toContainEqual({ from: 9, to: 23, kind: "hide" }); // ](https://x.y)
  });

  it("reveals the full link source when the caret is inside", () => {
    const d = summarize(makeState("see [docs](https://x.y) ok", 7));
    expect(d.filter((x) => x.kind === "hide")).toEqual([]);
    expect(d).toContainEqual({ from: 5, to: 9, kind: "cm-rm-link" });
  });
});

describe("buildDecorations — code fences", () => {
  // doc: "```js\nlet x = 1\n```\n\ntail" — fence lines 0-5 and 16-19, caret in tail
  const DOC = "```js\nlet x = 1\n```\n\ntail";

  it("styles all fence lines and hides the fence markers when not revealed", () => {
    const d = summarize(makeState(DOC, 21));
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-codeblock" });
    expect(d).toContainEqual({ from: 6, to: 6, kind: "cm-rm-codeblock" });
    expect(d).toContainEqual({ from: 16, to: 16, kind: "cm-rm-codeblock" });
    expect(d).toContainEqual({ from: 0, to: 5, kind: "hide" }); // ```js
    expect(d).toContainEqual({ from: 16, to: 19, kind: "hide" }); // ```
  });

  it("reveals fence markers styled when the caret is on a fence line", () => {
    const d = summarize(makeState(DOC, 2));
    expect(d).toContainEqual({ from: 0, to: 3, kind: "cm-rm-marker" });
    expect(d.some((x) => x.kind === "hide" && x.from === 0)).toBe(false);
  });
});

describe("buildDecorations — task lists", () => {
  it("replaces the task marker with a checkbox widget when not revealed", () => {
    const d = summarize(makeState("- [ ] todo\n- [x] done", 21));
    // caret at end of line 2 -> line 1's marker is a widget, line 2's is revealed
    expect(d).toContainEqual({ from: 2, to: 5, kind: "widget" });
    expect(d).toContainEqual({ from: 13, to: 16, kind: "cm-rm-marker" });
  });

  it("styles completed task lines", () => {
    const d = summarize(makeState("- [x] done\n\ntail", 14));
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-task-done" });
  });
});

describe("buildDecorations — images", () => {
  it("replaces an image with a widget when its line is not revealed", () => {
    setDocBaseUri("vscode-resource://doc");
    const d = summarize(makeState("![alt](pic.png)\n\ntail", 18));
    expect(d).toContainEqual({ from: 0, to: 15, kind: "widget" });
  });

  it("shows raw source when the caret is on the image's line", () => {
    const d = summarize(makeState("![alt](pic.png)\n\ntail", 3));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
  });

  it("renders angle-bracketed image destinations as widgets too", () => {
    setDocBaseUri("vscode-resource://doc");
    const d = summarize(makeState("![a](<pic name.png>)\n\ntail", 23));
    expect(d.some((x) => x.kind === "widget")).toBe(true);
  });
});

describe("buildDecorations — math", () => {
  it("replaces inline math with a widget when not revealed", () => {
    const d = summarize(makeState("a $x^2$ b", 0));
    expect(d).toContainEqual({ from: 2, to: 7, kind: "widget" });
  });

  it("reveals inline math source (marks styled) when the caret is inside", () => {
    const d = summarize(makeState("a $x^2$ b", 4));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
    expect(d).toContainEqual({ from: 2, to: 3, kind: "cm-rm-marker" });
    expect(d).toContainEqual({ from: 6, to: 7, kind: "cm-rm-marker" });
  });

  it("replaces a block math region with a widget when no line is revealed", () => {
    const d = summarize(makeState("$$\nE=mc^2\n$$\n\ntail", 15));
    expect(d).toContainEqual({ from: 0, to: 12, kind: "widget" });
  });
});

describe("buildDecorations — mermaid", () => {
  const DOC = "```mermaid\ngraph TD; A-->B\n```\n\ntail";

  it("replaces a mermaid fence with a widget when not revealed", () => {
    const d = summarize(makeState(DOC, DOC.length));
    expect(d).toContainEqual({ from: 0, to: 30, kind: "widget" });
  });

  it("falls back to normal code-fence rendering when revealed", () => {
    const d = summarize(makeState(DOC, 12));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-codeblock" });
  });
});

describe("buildDecorations — tables", () => {
  const TABLE_DOC = "| a | b |\n| --- | --- |\n| 1 | 2 |\n\ntail";

  it("replaces a table with a widget when no line is revealed", () => {
    const d = summarize(makeState(TABLE_DOC, TABLE_DOC.length));
    // The Table node ends where the blank line begins.
    expect(d).toContainEqual({ from: 0, to: TABLE_DOC.indexOf("\n\ntail"), kind: "widget" });
  });

  it("shows raw pipes (dimmed delimiters) when the caret is inside", () => {
    const d = summarize(makeState(TABLE_DOC, 2));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
    expect(d.some((x) => x.kind === "cm-rm-marker")).toBe(true);
  });

  it("leaves tables with inline HTML as raw source", () => {
    const doc = "| a <b>x</b> | c |\n| --- | --- |\n\ntail";
    const d = summarize(makeState(doc, doc.length));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
  });

  it("leaves blockquoted tables raw (block widgets need whole lines)", () => {
    const doc = "> | a | b |\n> | --- | --- |\n\ntail";
    const d = summarize(makeState(doc, doc.length));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
  });
});

describe("buildDecorations — render settings", () => {
  const MERMAID_DOC = "```mermaid\ngraph TD; A-->B\n```\n\ntail";

  afterEach(() => setRenderSettings({ math: true, mermaid: true, toolbar: true }));

  it("renders mermaid fences as plain code blocks when mermaid is disabled", () => {
    setRenderSettings({ math: true, mermaid: false, toolbar: true });
    const d = summarize(makeState(MERMAID_DOC, MERMAID_DOC.length));
    expect(d.filter((x) => x.kind === "widget")).toEqual([]);
    expect(d).toContainEqual({ from: 0, to: 0, kind: "cm-rm-codeblock" });
  });
});
