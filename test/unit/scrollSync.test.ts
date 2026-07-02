import { describe, it, expect } from "vitest";
import { targetOffsetForLine, type Anchor } from "../../src/shared/scrollSync";

const anchors: Anchor[] = [
  { line: 0, offsetTop: 0 },
  { line: 10, offsetTop: 200 },
  { line: 20, offsetTop: 600 },
];

describe("targetOffsetForLine (FIR-82)", () => {
  it("returns 0 for empty anchors", () => {
    expect(targetOffsetForLine([], 5)).toBe(0);
  });
  it("clamps to the first anchor for a line at or before it", () => {
    expect(targetOffsetForLine(anchors, 0)).toBe(0);
    expect(targetOffsetForLine(anchors, -3)).toBe(0);
  });
  it("returns an exact anchor offset on a hit", () => {
    expect(targetOffsetForLine(anchors, 10)).toBe(200);
  });
  it("interpolates between the two bracketing anchors", () => {
    // line 15 is halfway between line 10 (200) and line 20 (600) => 400
    expect(targetOffsetForLine(anchors, 15)).toBe(400);
  });
  it("clamps to the last anchor past the end", () => {
    expect(targetOffsetForLine(anchors, 99)).toBe(600);
  });
});
