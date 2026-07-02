import { describe, it, expect } from "vitest";
import { isWithinRoots } from "../../src/preview/pathScope";

describe("isWithinRoots (FIR-80 preview retarget)", () => {
  const roots = ["/home/u/ws", "/opt/ext"];

  it("is true when the child equals a root", () => {
    expect(isWithinRoots("/home/u/ws", roots)).toBe(true);
  });

  it("is true when the child is nested inside a root", () => {
    expect(isWithinRoots("/home/u/ws/docs/sub", roots)).toBe(true);
    expect(isWithinRoots("/opt/ext/dist", roots)).toBe(true);
  });

  it("is false when the child is outside every root", () => {
    expect(isWithinRoots("/home/u/other/doc", roots)).toBe(false);
  });

  it("is false for a sibling that shares a string prefix but not a path boundary", () => {
    // "/home/u/workspace" is NOT inside "/home/u/ws" despite the prefix.
    expect(isWithinRoots("/home/u/workspace", ["/home/u/ws"])).toBe(false);
  });

  it("treats a directory whose name starts with '..' as nested, not an escape", () => {
    expect(isWithinRoots("/home/u/ws/..cache/doc", ["/home/u/ws"])).toBe(true);
  });

  it("is false when there are no roots", () => {
    expect(isWithinRoots("/anything", [])).toBe(false);
  });
});
