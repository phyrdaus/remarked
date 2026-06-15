import { describe, it, expect } from "vitest";
import {
  extensionForMime,
  splitFolderSetting,
  buildImageFilename,
  imageMarkdown,
} from "../../src/shared/imageAssets";

const NOW = new Date(2026, 5, 11, 21, 30, 5); // 2026-06-11 21:30:05 local

describe("extensionForMime", () => {
  it("maps the supported image mimes", () => {
    expect(extensionForMime("image/png")).toBe(".png");
    expect(extensionForMime("image/jpeg")).toBe(".jpg");
    expect(extensionForMime("image/gif")).toBe(".gif");
    expect(extensionForMime("image/webp")).toBe(".webp");
    expect(extensionForMime("image/svg+xml")).toBe(".svg");
    expect(extensionForMime("image/bmp")).toBe(".bmp");
  });
  it("returns null for anything else", () => {
    expect(extensionForMime("text/html")).toBeNull();
    expect(extensionForMime("application/pdf")).toBeNull();
    expect(extensionForMime("image/x-icon")).toBeNull();
  });
});

describe("splitFolderSetting", () => {
  it("splits a relative folder into segments", () => {
    expect(splitFolderSetting("assets")).toEqual(["assets"]);
    expect(splitFolderSetting("img/pasted/")).toEqual(["img", "pasted"]);
    expect(splitFolderSetting("")).toEqual([]);
  });
  it("refuses traversal and absolute paths (null = unsafe)", () => {
    expect(splitFolderSetting("../outside")).toBeNull();
    expect(splitFolderSetting("a/../../b")).toBeNull();
    expect(splitFolderSetting("/etc")).toBeNull();
    expect(splitFolderSetting("C:\\temp")).toBeNull();
  });
});

describe("buildImageFilename", () => {
  const never = () => false;

  it("keeps a meaningful original name, with the mime's extension", () => {
    expect(
      buildImageFilename({ originalName: "Screenshot Final.PNG", mime: "image/png", now: NOW, exists: never })
    ).toBe("Screenshot-Final.png");
  });

  it("falls back to a timestamp for generic clipboard names", () => {
    expect(buildImageFilename({ originalName: "image.png", mime: "image/png", now: NOW, exists: never })).toBe(
      "image-20260611-213005.png"
    );
    expect(buildImageFilename({ originalName: "", mime: "image/jpeg", now: NOW, exists: never })).toBe(
      "image-20260611-213005.jpg"
    );
  });

  it("dedupes with a numeric suffix", () => {
    const taken = new Set(["pic.png", "pic-2.png"]);
    expect(
      buildImageFilename({ originalName: "pic.png", mime: "image/png", now: NOW, exists: (n) => taken.has(n) })
    ).toBe("pic-3.png");
  });

  it("sanitizes hostile names", () => {
    const name = buildImageFilename({
      originalName: "../../we{ird}  name?.png",
      mime: "image/png",
      now: NOW,
      exists: never,
    });
    expect(name).toBe("we-ird-name.png");
  });
});

describe("imageMarkdown", () => {
  it("builds a plain link", () => {
    expect(imageMarkdown("assets/pic.png", "pic")).toBe("![pic](assets/pic.png)");
  });
  it("angle-brackets paths containing spaces", () => {
    expect(imageMarkdown("assets/my pic.png", "")).toBe("![](<assets/my pic.png>)");
  });
  it("strips brackets and newlines from alt text", () => {
    expect(imageMarkdown("a.png", "x]y[z\nw")).toBe("![x y z w](a.png)");
  });
});
