import { describe, it, expect } from "vitest";
import { computeReplacement } from "../../src/shared/replace";

describe("computeReplacement", () => {
  it("returns null for identical text", () => {
    expect(computeReplacement("abc", "abc")).toBeNull();
  });

  it("computes middle replacement", () => {
    expect(computeReplacement("hello world", "hello brave world")).toEqual({
      from: 6,
      to: 6,
      insert: "brave ",
    });
  });

  it("computes deletion", () => {
    expect(computeReplacement("a big cat", "a cat")).toEqual({
      from: 2,
      to: 6,
      insert: "",
    });
  });

  it("handles full replacement", () => {
    expect(computeReplacement("abc", "xyz")).toEqual({ from: 0, to: 3, insert: "xyz" });
  });

  it("handles insertion at start and end", () => {
    expect(computeReplacement("bc", "abc")).toEqual({ from: 0, to: 0, insert: "a" });
    expect(computeReplacement("ab", "abc")).toEqual({ from: 2, to: 2, insert: "c" });
  });

  it("handles repeated characters without overlapping prefix/suffix", () => {
    // old "aaa" -> new "aa": prefix scan must not overrun suffix scan
    expect(computeReplacement("aaa", "aa")).toEqual({ from: 2, to: 3, insert: "" });
  });

  it("applying the replacement to oldText always yields newText", () => {
    const pairs: Array<[string, string]> = [
      ["abc", "abc"],
      ["hello world", "hello brave world"],
      ["a big cat", "a cat"],
      ["abc", "xyz"],
      ["bc", "abc"],
      ["ab", "abc"],
      ["aaa", "aa"],
      ["", "abc"],
      ["abc", ""],
      ["😀", "😁"], // splits a surrogate pair; safe because offsets are UTF-16 code units
    ];
    for (const [oldText, newText] of pairs) {
      const r = computeReplacement(oldText, newText);
      const applied = r === null ? oldText : oldText.slice(0, r.from) + r.insert + oldText.slice(r.to);
      expect(applied).toBe(newText);
    }
  });
});
