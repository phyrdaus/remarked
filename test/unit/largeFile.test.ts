import { describe, it, expect } from "vitest";
import { renderLargeFilePrompt } from "../../src/webview/largeFile";
import type { ToHost } from "../../src/shared/messages";

describe("renderLargeFilePrompt", () => {
  function setup() {
    const root = document.createElement("div");
    const posted: ToHost[] = [];
    renderLargeFilePrompt(root, 3.5 * 1024 * 1024, (m) => posted.push(m));
    return { root, posted };
  }

  it("shows the size and both choices", () => {
    const { root } = setup();
    expect(root.textContent).toContain("3.5 MB");
    const buttons = root.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
  });

  it("posts renderAnyway / openAsText on click", () => {
    const { root, posted } = setup();
    const [render, text] = Array.from(root.querySelectorAll("button"));
    render.click();
    text.click();
    expect(posted).toEqual([{ type: "renderAnyway" }, { type: "openAsText" }]);
  });

  it("replaces previous content", () => {
    const { root } = setup();
    renderLargeFilePrompt(root, 1024 * 1024, () => {});
    expect(root.querySelectorAll("button")).toHaveLength(2); // not 4
  });
});
