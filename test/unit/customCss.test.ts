import { describe, it, expect } from "vitest";
import { resolveCustomCssFsPath } from "../../src/editor/customCss";

describe("resolveCustomCssFsPath", () => {
  it("returns null for unset/blank settings", () => {
    expect(resolveCustomCssFsPath(undefined, "/ws")).toBeNull();
    expect(resolveCustomCssFsPath("", "/ws")).toBeNull();
    expect(resolveCustomCssFsPath("   ", "/ws")).toBeNull();
  });

  it("passes absolute paths through", () => {
    expect(resolveCustomCssFsPath("/themes/my.css", "/ws")).toBe("/themes/my.css");
  });

  it("resolves relative paths against the first workspace folder", () => {
    expect(resolveCustomCssFsPath("styles/doc.css", "/ws")).toBe("/ws/styles/doc.css");
  });

  it("returns null for relative paths without a workspace", () => {
    expect(resolveCustomCssFsPath("styles/doc.css", undefined)).toBeNull();
  });
});
