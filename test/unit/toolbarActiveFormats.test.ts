import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { activeFormats } from "../../src/webview/toolbar/activeFormats";

function stateAt(doc: string, head: number): EditorState {
  const state = EditorState.create({
    doc,
    selection: { anchor: head },
    extensions: [markdown({ base: markdownLanguage })],
  });
  ensureSyntaxTree(state, doc.length, 5000);
  return state;
}

describe("activeFormats", () => {
  it("detects bold inside **strong**", () => {
    const doc = "a **bold** b";
    expect(activeFormats(stateAt(doc, 5)).has("bold")).toBe(true);
  });
  it("detects italic and inline code", () => {
    expect(activeFormats(stateAt("*i*", 1)).has("italic")).toBe(true);
    expect(activeFormats(stateAt("`c`", 1)).has("code")).toBe(true);
  });
  it("detects strikethrough", () => {
    expect(activeFormats(stateAt("~~x~~", 2)).has("strike")).toBe(true);
  });
  it("detects heading level from the cursor line", () => {
    expect(activeFormats(stateAt("## title", 4)).has("h2")).toBe(true);
    expect(activeFormats(stateAt("# title", 3)).has("h1")).toBe(true);
    expect(activeFormats(stateAt("### t", 4)).has("h3")).toBe(true);
  });
  it("detects list kinds and blockquote from the cursor line", () => {
    expect(activeFormats(stateAt("- item", 3)).has("bullet")).toBe(true);
    expect(activeFormats(stateAt("1. item", 4)).has("ordered")).toBe(true);
    expect(activeFormats(stateAt("- [ ] todo", 7)).has("task")).toBe(true);
    expect(activeFormats(stateAt("- [ ] todo", 7)).has("bullet")).toBe(false);
    expect(activeFormats(stateAt("> quote", 3)).has("blockquote")).toBe(true);
  });
  it("returns an empty set on a plain paragraph", () => {
    expect(activeFormats(stateAt("plain text", 3)).size).toBe(0);
  });
  it("lights bold when the cursor is on the opening marker", () => {
    expect(activeFormats(stateAt("**bold**", 0)).has("bold")).toBe(true);
  });
  it("detects a task with nothing after the checkbox", () => {
    expect(activeFormats(stateAt("- [ ]", 4)).has("task")).toBe(true);
    expect(activeFormats(stateAt("- [ ]", 4)).has("bullet")).toBe(false);
  });
  it("does not light any heading button for h4+", () => {
    const s = activeFormats(stateAt("#### deep", 5));
    expect(s.has("h1") || s.has("h2") || s.has("h3")).toBe(false);
  });
});
