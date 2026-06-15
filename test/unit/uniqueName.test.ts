import { describe, it, expect } from "vitest";
import { uniqueName } from "../../src/export/uniqueName";

describe("uniqueName", () => {
  it("returns the name unchanged when free, suffixes when taken", () => {
    const used = new Set<string>();
    expect(uniqueName("pic.png", used)).toBe("pic.png");
    expect(uniqueName("pic.png", used)).toBe("pic-2.png");
    expect(uniqueName("pic.png", used)).toBe("pic-3.png");
  });
  it("handles extensionless and dotfile names", () => {
    const used = new Set<string>();
    expect(uniqueName("README", used)).toBe("README");
    expect(uniqueName("README", used)).toBe("README-2");
    expect(uniqueName(".hidden", used)).toBe(".hidden");
    expect(uniqueName(".hidden", used)).toBe(".hidden-2");
  });
});
