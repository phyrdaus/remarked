import { describe, it, expect } from "vitest";
import { isOpenableHref, isMarkdownFsPath } from "../../src/shared/links";

describe("isOpenableHref", () => {
  it("accepts http and https", () => {
    expect(isOpenableHref("https://example.com")).toBe(true);
    expect(isOpenableHref("HTTP://example.com/x?y=1")).toBe(true);
  });
  it("refuses every other scheme", () => {
    for (const href of [
      "file:///etc/passwd",
      "vscode://settings",
      "javascript:alert(1)",
      "data:text/html,hi",
      "mailto:a@b.c",
      "relative/path.md",
      "",
    ]) {
      expect(isOpenableHref(href)).toBe(false);
    }
  });
});

describe("isMarkdownFsPath", () => {
  it("accepts .md and .markdown, case-insensitively", () => {
    expect(isMarkdownFsPath("/a/b/notes.md")).toBe(true);
    expect(isMarkdownFsPath("/a/b/NOTES.MD")).toBe(true);
    expect(isMarkdownFsPath("C:\\docs\\readme.markdown")).toBe(true);
    expect(isMarkdownFsPath("/a/b/x.Markdown")).toBe(true);
  });
  it("refuses other extensions", () => {
    expect(isMarkdownFsPath("/a/b/notes.mdx")).toBe(false);
    expect(isMarkdownFsPath("/a/b/notes.txt")).toBe(false);
    expect(isMarkdownFsPath("/a/b/md")).toBe(false);
  });
});
