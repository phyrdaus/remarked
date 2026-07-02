import { describe, it, expect } from "vitest";
import { Text } from "@codemirror/state";
import { SearchQuery } from "@codemirror/search";
import { matchInfo, countLabel } from "../../src/webview/searchCount";

// "foo" occurs at [0,3), [8,11) on line 1 and [16,19) on line 2.
const doc = Text.of(["foo bar foo", "baz foo"]);
const q = new SearchQuery({ search: "foo" });

describe("matchInfo (find result count, FIR-85 follow-on)", () => {
  it("counts every match", () => {
    expect(matchInfo(doc, q, -1, -1).count).toBe(3);
  });

  it("reports the 1-based index of the match at the selection", () => {
    expect(matchInfo(doc, q, 8, 11)).toEqual({ count: 3, current: 2 });
    expect(matchInfo(doc, q, 16, 19)).toEqual({ count: 3, current: 3 });
  });

  it("current is 0 when the selection isn't on a match", () => {
    expect(matchInfo(doc, q, 4, 5)).toEqual({ count: 3, current: 0 });
  });

  it("returns 0/0 for an empty query", () => {
    expect(matchInfo(doc, new SearchQuery({ search: "" }), 0, 0)).toEqual({
      count: 0,
      current: 0,
    });
  });
});

describe("countLabel", () => {
  it("shows 'No results' at zero", () => expect(countLabel(0, 0)).toBe("No results"));
  it("shows 'X of Y' when on a match", () => expect(countLabel(12, 3)).toBe("3 of 12"));
  it("shows 'Y results' when off a match", () => expect(countLabel(12, 0)).toBe("12 results"));
});
