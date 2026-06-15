import { describe, it, expect, beforeEach } from "vitest";
import { setDocBaseUri, setRootBaseUri, resolveImageSrc } from "../../src/webview/render/imageBase";

describe("resolveImageSrc", () => {
  beforeEach(() => {
    setDocBaseUri("https://res.example/doc/dir");
    setRootBaseUri("https://res.example");
  });

  it("passes http(s) through and resolves relative paths against the doc dir", () => {
    expect(resolveImageSrc("https://x.y/a.png")).toBe("https://x.y/a.png");
    expect(resolveImageSrc("./pic.png")).toBe("https://res.example/doc/dir/pic.png");
    expect(resolveImageSrc("sub/pic.png")).toBe("https://res.example/doc/dir/sub/pic.png");
  });

  it("allows data:image URIs (CSP permits them; they are inert)", () => {
    const src = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveImageSrc(src)).toBe(src);
  });

  it("still refuses non-image data:, file: and vscode: srcs", () => {
    expect(resolveImageSrc("data:text/html,hi")).toBe("");
    expect(resolveImageSrc("file:///etc/passwd")).toBe("");
    expect(resolveImageSrc("vscode://x")).toBe("");
  });

  it("resolves absolute paths via the root base uri", () => {
    expect(resolveImageSrc("/Users/x/pic.png")).toBe("https://res.example/Users/x/pic.png");
  });

  it("returns unloadable for absolute paths when no root base uri is set", () => {
    setRootBaseUri("");
    expect(resolveImageSrc("/Users/x/pic.png")).toBe("");
  });

  it("refuses protocol-relative srcs", () => {
    expect(resolveImageSrc("//evil.example/x.png")).toBe("");
  });
});
