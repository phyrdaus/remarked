import { describe, it, expect } from "vitest";
import { countWords, readingTimeMinutes, wordCountLabel } from "../../src/shared/wordCount";

describe("countWords", () => {
  it("counts whitespace-separated word tokens", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t ")).toBe(0);
  });
  it("ignores punctuation-only tokens (markdown markers)", () => {
    // word tokens: Heading, item, one, item, two — the #, -, --- markers don't count
    expect(countWords("# Heading\n\n- item one\n- item two\n\n---\n")).toBe(5);
    expect(countWords("| a | b |\n| --- | --- |")).toBe(2);
  });
  it("counts unicode words", () => {
    expect(countWords("日本語 テスト étude")).toBe(3);
  });
});

describe("readingTimeMinutes", () => {
  it("rounds to at least one minute for any words", () => {
    expect(readingTimeMinutes(0)).toBe(0);
    expect(readingTimeMinutes(50)).toBe(1);
    expect(readingTimeMinutes(200)).toBe(1);
    expect(readingTimeMinutes(450)).toBe(2);
  });
});

describe("wordCountLabel", () => {
  it("formats the status text", () => {
    expect(wordCountLabel("one two three")).toBe("3 words · 1 min");
    expect(wordCountLabel("")).toBe("0 words");
  });
});
