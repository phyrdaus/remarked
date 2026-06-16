import { describe, it, expect } from "vitest";
import { nextDefaultEditorState, withMarkdownDefault } from "../../src/commands/defaultEditorState";

describe("nextDefaultEditorState", () => {
  it("treats unset and remarked associations as 'remarked is default' and flips to text", () => {
    expect(nextDefaultEditorState(undefined)).toEqual({ next: "default", remarkedWasDefault: true });
    expect(nextDefaultEditorState({ "*.md": "remarked.editor" })).toEqual({
      next: "default",
      remarkedWasDefault: true,
    });
  });

  it("flips an explicit text-editor association back to remarked", () => {
    expect(nextDefaultEditorState({ "*.md": "default" })).toEqual({
      next: "remarked.editor",
      remarkedWasDefault: false,
    });
    expect(nextDefaultEditorState({ "*.md": "someOther.editor" })).toEqual({
      next: "remarked.editor",
      remarkedWasDefault: false,
    });
  });

  it("ignores unrelated associations (they must not be copied around)", () => {
    expect(nextDefaultEditorState({ "*.svg": "x.editor" })).toEqual({
      next: "default",
      remarkedWasDefault: true,
    });
  });
});

describe("withMarkdownDefault", () => {
  it("sets both markdown globs to the target", () => {
    expect(withMarkdownDefault(undefined, "default")).toEqual({
      "*.md": "default",
      "*.markdown": "default",
    });
    expect(withMarkdownDefault({}, "remarked.editor")).toEqual({
      "*.md": "remarked.editor",
      "*.markdown": "remarked.editor",
    });
  });

  it("preserves unrelated associations", () => {
    expect(withMarkdownDefault({ "*.svg": "x.editor" }, "default")).toEqual({
      "*.svg": "x.editor",
      "*.md": "default",
      "*.markdown": "default",
    });
  });

  it("overwrites any prior markdown association", () => {
    expect(withMarkdownDefault({ "*.md": "default", "*.markdown": "default" }, "remarked.editor")).toEqual({
      "*.md": "remarked.editor",
      "*.markdown": "remarked.editor",
    });
  });
});
