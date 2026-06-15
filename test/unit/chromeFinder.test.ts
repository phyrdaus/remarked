import { describe, it, expect } from "vitest";
import { chromeCandidates } from "../../src/export/chromeFinder";

describe("chromeCandidates", () => {
  it("lists macOS app bundle binaries", () => {
    const c = chromeCandidates("darwin", {});
    expect(c).toContain("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    expect(c).toContain("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
  });

  it("builds windows paths from environment roots", () => {
    const c = chromeCandidates("win32", {
      "PROGRAMFILES": "C:\\Program Files",
      "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
      "LOCALAPPDATA": "C:\\Users\\u\\AppData\\Local",
    });
    expect(c).toContain("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
    expect(c).toContain("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");
  });

  it("lists standard linux locations", () => {
    const c = chromeCandidates("linux", {});
    expect(c).toContain("/usr/bin/google-chrome");
    expect(c).toContain("/usr/bin/chromium-browser");
  });

  it("puts an explicit CHROME_PATH first on any platform", () => {
    const c = chromeCandidates("linux", { CHROME_PATH: "/opt/my-chrome" });
    expect(c[0]).toBe("/opt/my-chrome");
  });
});
