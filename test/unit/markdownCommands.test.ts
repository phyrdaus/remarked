import { describe, it, expect } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { toggleMarkSpec, insertLinkSpec } from "../../src/webview/markdownCommands";

function state(doc: string, anchor: number, head = anchor): EditorState {
  const s = EditorState.create({
    doc,
    selection: EditorSelection.single(anchor, head),
    extensions: [markdown({ base: markdownLanguage })],
  });
  ensureSyntaxTree(s, doc.length, 5000);
  return s;
}

function apply(s: EditorState, spec: ReturnType<typeof toggleMarkSpec>): string {
  return s.update(spec).state.doc.toString();
}

describe("toggleMarkSpec", () => {
  it("wraps a selection in ** **", () => {
    const s = state("make this bold", 5, 9);
    expect(apply(s, toggleMarkSpec(s, "**", "StrongEmphasis"))).toBe("make **this** bold");
  });

  it("unwraps when the selection is already strong", () => {
    const s = state("make **this** bold", 7, 11);
    expect(apply(s, toggleMarkSpec(s, "**", "StrongEmphasis"))).toBe("make this bold");
  });

  it("unwraps when the caret merely sits inside strong text", () => {
    const s = state("make **this** bold", 9);
    expect(apply(s, toggleMarkSpec(s, "**", "StrongEmphasis"))).toBe("make this bold");
  });

  it("wraps with * for italics", () => {
    const s = state("hello world", 0, 5);
    expect(apply(s, toggleMarkSpec(s, "*", "Emphasis"))).toBe("*hello* world");
  });

  it("wraps with backticks for inline code", () => {
    const s = state("ls -la", 0, 6);
    expect(apply(s, toggleMarkSpec(s, "`", "InlineCode"))).toBe("`ls -la`");
  });

  it("unwraps without throwing when the caret sits inside the closing marker at doc end", () => {
    const s = state("**bold**", 7);
    const next = s.update(toggleMarkSpec(s, "**", "StrongEmphasis"));
    expect(next.state.doc.toString()).toBe("bold");
    expect(next.state.selection.main.head).toBe(4);
  });

  it("keeps the selection on the content when the whole node was selected", () => {
    const s = state("make **this** bold", 5, 13);
    const next = s.update(toggleMarkSpec(s, "**", "StrongEmphasis"));
    expect(next.state.doc.toString()).toBe("make this bold");
    const sel = next.state.selection.main;
    expect(next.state.doc.sliceString(sel.from, sel.to)).toBe("this");
  });
});

describe("insertLinkSpec", () => {
  it("wraps the selection as link text and selects the url placeholder", () => {
    const s = state("read docs now", 5, 9);
    const spec = insertLinkSpec(s);
    const next = s.update(spec);
    expect(next.state.doc.toString()).toBe("read [docs](url) now");
    const sel = next.state.selection.main;
    expect(next.state.doc.sliceString(sel.from, sel.to)).toBe("url");
  });
});

import { insertNewlineContinueMarkup, deleteMarkupBackward } from "@codemirror/lang-markdown";
import type { StateCommand } from "@codemirror/state";

describe("markdown continuation commands (library wiring sanity)", () => {
  function runCmd(cmd: StateCommand, doc: string, cursor: number): string | null {
    const s = state(doc, cursor);
    let out: string | null = null;
    const handled = cmd({ state: s, dispatch: (tr) => (out = tr.state.doc.toString()) });
    return handled ? out : null;
  }

  it("Enter continues a list item", () => {
    expect(runCmd(insertNewlineContinueMarkup, "- one", 5)).toBe("- one\n- ");
  });

  it("Backspace deletes list markup", () => {
    expect(runCmd(deleteMarkupBackward, "- one", 2)).toBe("one");
  });
});
