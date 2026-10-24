import { describe, it, expect, vi } from "vitest";

// Mocked mermaid: jsdom has no layout, so a valid diagram can't really render
// here. What's under test is renderMermaid's own handling of the container.
const { render } = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock("mermaid", () => ({ default: { initialize: vi.fn(), render } }));

import { renderMermaid } from "../../src/webview/render/mermaid";

const PARSE_ERROR = "Parse error on line 2:\n...lowchart LR  A -->\n---------------------^\nExpecting 'NODE_STRING', got 'EOF'";

describe("renderMermaid reusing a container", () => {
  it("a successful render after a failed one clears the error class and tooltip", async () => {
    const container = document.createElement("div");

    render.mockRejectedValueOnce(new Error(PARSE_ERROR));
    renderMermaid("flowchart LR\n  A -->", container);
    await vi.waitFor(() => expect(container.classList.contains("cm-rm-mermaid-error")).toBe(true));
    expect(container.title).toBe(PARSE_ERROR);

    render.mockResolvedValueOnce({ svg: "<svg></svg>" });
    renderMermaid("flowchart LR\n  A --> B", container);
    // The loading state already drops the old error, not only the final SVG.
    expect(container.classList.contains("cm-rm-mermaid-error")).toBe(false);
    expect(container.title).toBe("");
    await vi.waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(container.classList.contains("cm-rm-mermaid-error")).toBe(false);
    expect(container.title).toBe("");
  });
});
