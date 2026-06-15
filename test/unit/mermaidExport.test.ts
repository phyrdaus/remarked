import { describe, it, expect } from "vitest";
import { handleExportRenderMermaid } from "../../src/webview/exportMermaid";
import type { ToHost } from "../../src/shared/messages";

describe("handleExportRenderMermaid", () => {
  it("renders all sources and posts one reply with the requestId", async () => {
    const posted: ToHost[] = [];
    await handleExportRenderMermaid(
      { requestId: 7, sources: ["a", "b"] },
      async (s) => `<svg>${s}</svg>`,
      (m) => posted.push(m)
    );
    expect(posted).toEqual([
      { type: "export:mermaidSvgs", requestId: 7, svgs: ["<svg>a</svg>", "<svg>b</svg>"] },
    ]);
  });

  it("maps individual failures to nulls without failing the batch", async () => {
    const posted: ToHost[] = [];
    await handleExportRenderMermaid(
      { requestId: 1, sources: ["ok", "boom"] },
      async (s) => {
        if (s === "boom") throw new Error("x");
        return "<svg/>";
      },
      (m) => posted.push(m)
    );
    expect(posted[0]).toEqual({ type: "export:mermaidSvgs", requestId: 1, svgs: ["<svg/>", null] });
  });

  it("handles the empty batch", async () => {
    const posted: ToHost[] = [];
    await handleExportRenderMermaid({ requestId: 2, sources: [] }, async () => null, (m) => posted.push(m));
    expect(posted[0]).toEqual({ type: "export:mermaidSvgs", requestId: 2, svgs: [] });
  });
});
