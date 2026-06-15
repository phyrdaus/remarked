import { describe, it, expect } from "vitest";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import {
  setHeadingSpec,
  toggleBlockquoteSpec,
  toggleListSpec,
  insertTableSpec,
  insertHorizontalRuleSpec,
  wrapCodeBlockSpec,
} from "../../src/webview/toolbar/commands";

function apply(doc: string, head: number, spec: (s: EditorState) => TransactionSpec): string {
  const state = EditorState.create({ doc, selection: { anchor: head } });
  return state.update(spec(state)).state.doc.toString();
}

describe("setHeadingSpec", () => {
  it("adds the heading prefix to a plain line", () => {
    expect(apply("title", 2, (s) => setHeadingSpec(s, 2))).toBe("## title");
  });
  it("changes an existing heading level", () => {
    expect(apply("# title", 3, (s) => setHeadingSpec(s, 3))).toBe("### title");
  });
  it("toggles the active level back to a paragraph", () => {
    expect(apply("## title", 4, (s) => setHeadingSpec(s, 2))).toBe("title");
  });
  it("operates only on the cursor's line", () => {
    expect(apply("a\nb\nc", 2, (s) => setHeadingSpec(s, 1))).toBe("a\n# b\nc");
  });
});

function applyRange(doc: string, from: number, to: number, spec: (s: EditorState) => TransactionSpec): string {
  const state = EditorState.create({ doc, selection: { anchor: from, head: to } });
  return state.update(spec(state)).state.doc.toString();
}

describe("toggleBlockquoteSpec", () => {
  it("quotes a plain line and unquotes a quoted one", () => {
    expect(applyRange("a", 0, 1, toggleBlockquoteSpec)).toBe("> a");
    expect(applyRange("> a", 0, 3, toggleBlockquoteSpec)).toBe("a");
  });
  it("quotes every line in the selection", () => {
    expect(applyRange("a\nb", 0, 3, toggleBlockquoteSpec)).toBe("> a\n> b");
  });
  it("unquotes every line of a multi-line quote", () => {
    expect(applyRange("> a\n> b", 0, 7, toggleBlockquoteSpec)).toBe("a\nb");
  });
});

describe("toggleListSpec", () => {
  it("toggles a bullet on and off", () => {
    expect(applyRange("a", 0, 1, (s) => toggleListSpec(s, "bullet"))).toBe("- a");
    expect(applyRange("- a", 0, 3, (s) => toggleListSpec(s, "bullet"))).toBe("a");
  });
  it("makes an ordered and a task list", () => {
    expect(applyRange("a", 0, 1, (s) => toggleListSpec(s, "ordered"))).toBe("1. a");
    expect(applyRange("a", 0, 1, (s) => toggleListSpec(s, "task"))).toBe("- [ ] a");
  });
  it("switches between list kinds (bullet -> ordered)", () => {
    expect(applyRange("- a", 0, 3, (s) => toggleListSpec(s, "ordered"))).toBe("1. a");
  });
  it("numbers ordered lists sequentially across lines", () => {
    expect(applyRange("a\nb", 0, 3, (s) => toggleListSpec(s, "ordered"))).toBe("1. a\n2. b");
  });
  it("converts a task line to a plain bullet (not stripped)", () => {
    expect(applyRange("- [ ] x", 0, 7, (s) => toggleListSpec(s, "bullet"))).toBe("- x");
  });
  it("toggles a task list off", () => {
    expect(applyRange("- [ ] x", 0, 7, (s) => toggleListSpec(s, "task"))).toBe("x");
  });
  it("skips blank lines when applying a bullet list", () => {
    expect(applyRange("a\n\nb", 0, 4, (s) => toggleListSpec(s, "bullet"))).toBe("- a\n\n- b");
  });
  it("numbers ordered items ignoring blank lines", () => {
    expect(applyRange("a\n\nb", 0, 4, (s) => toggleListSpec(s, "ordered"))).toBe("1. a\n\n2. b");
  });
});

describe("insert commands", () => {
  it("inserts a starter table on its own lines after the cursor line", () => {
    const out = apply("para", 4, insertTableSpec);
    expect(out).toContain("| Column 1 | Column 2 |");
    expect(out).toContain("| --- | --- |");
    expect(out.startsWith("para\n\n")).toBe(true);
  });
  it("inserts a horizontal rule on its own line", () => {
    const out = apply("para", 4, insertHorizontalRuleSpec);
    expect(out).toContain("\n---\n");
  });
  it("wraps the selection in a fenced code block", () => {
    const state = EditorState.create({ doc: "x = 1", selection: { anchor: 0, head: 5 } });
    const out = state.update(wrapCodeBlockSpec(state)).state.doc.toString();
    expect(out).toBe("```\nx = 1\n```");
  });
});
