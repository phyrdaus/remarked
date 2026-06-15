import { describe, it, expect } from "vitest";
import { extractHeadings } from "../../src/shared/outline";

describe("extractHeadings", () => {
  it("extracts ATX headings with level, title, and offset", () => {
    const doc = "# One\n\ntext\n\n## Two\n### Three #\n";
    expect(extractHeadings(doc)).toEqual([
      { level: 1, title: "One", pos: 0 },
      { level: 2, title: "Two", pos: 13 },
      { level: 3, title: "Three", pos: 20 },
    ]);
  });

  it("ignores hashes inside fenced code blocks", () => {
    const doc = "# Real\n```\n# comment, not a heading\n```\n## Also real\n";
    expect(extractHeadings(doc).map((h) => h.title)).toEqual(["Real", "Also real"]);
  });

  it("handles tildes fences and mismatched fence chars", () => {
    const doc = "~~~\n# hidden\n~~~\n# Shown\n";
    expect(extractHeadings(doc).map((h) => h.title)).toEqual(["Shown"]);
  });

  it("requires a space after the hashes and at most 6 levels", () => {
    const doc = "#nope\n####### too deep\n#  Spaced\n";
    expect(extractHeadings(doc)).toEqual([
      { level: 1, title: "Spaced", pos: doc.indexOf("#  Spaced") },
    ]);
  });

  it("returns empty for headingless documents", () => {
    expect(extractHeadings("just\ntext\n")).toEqual([]);
  });

  it("handles CRLF line endings (titles trimmed, offsets count the \\r)", () => {
    const doc = "# One\r\n\r\n## Two\r\n";
    expect(extractHeadings(doc)).toEqual([
      { level: 1, title: "One", pos: 0 },
      { level: 2, title: "Two", pos: doc.indexOf("## Two") },
    ]);
  });

  it("an unclosed fence hides all trailing headings", () => {
    expect(extractHeadings("# Real\n```\n# hidden forever\n")).toEqual([
      { level: 1, title: "Real", pos: 0 },
    ]);
  });
});
