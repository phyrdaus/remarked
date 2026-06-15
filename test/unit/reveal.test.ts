import { describe, it, expect } from "vitest";
import { EditorSelection } from "@codemirror/state";
import { touchesSelection } from "../../src/webview/render/reveal";

describe("touchesSelection", () => {
  it("true when a cursor sits inside the range", () => {
    expect(touchesSelection(EditorSelection.single(5), 2, 8)).toBe(true);
  });
  it("true when the cursor sits on either boundary (entering/leaving a span)", () => {
    expect(touchesSelection(EditorSelection.single(2), 2, 8)).toBe(true);
    expect(touchesSelection(EditorSelection.single(8), 2, 8)).toBe(true);
  });
  it("false when the cursor is outside", () => {
    expect(touchesSelection(EditorSelection.single(1), 2, 8)).toBe(false);
    expect(touchesSelection(EditorSelection.single(9), 2, 8)).toBe(false);
  });
  it("true when a non-empty selection overlaps the range", () => {
    expect(touchesSelection(EditorSelection.single(0, 3), 2, 8)).toBe(true);
    expect(touchesSelection(EditorSelection.single(7, 12), 2, 8)).toBe(true);
  });
  it("false when a non-empty selection is disjoint", () => {
    expect(touchesSelection(EditorSelection.single(9, 12), 2, 8)).toBe(false);
  });
  it("handles multiple selection ranges", () => {
    const sel = EditorSelection.create([EditorSelection.range(0, 1), EditorSelection.range(5, 6)], 0);
    expect(touchesSelection(sel, 2, 8)).toBe(true);
  });
});
