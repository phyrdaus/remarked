// Host-only. Finds the user's installed Chromium-family browser; never
// downloads anything (spec).
import { existsSync } from "node:fs";

export function chromeCandidates(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>
): string[] {
  const fromEnv = env.CHROME_PATH ? [env.CHROME_PATH] : [];
  if (platform === "darwin") {
    return [
      ...fromEnv,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ];
  }
  if (platform === "win32") {
    const roots = [env["PROGRAMFILES"], env["PROGRAMFILES(X86)"], env["LOCALAPPDATA"]].filter(
      (r): r is string => !!r
    );
    return [
      ...fromEnv,
      ...roots.map((r) => `${r}\\Google\\Chrome\\Application\\chrome.exe`),
      ...roots.map((r) => `${r}\\Microsoft\\Edge\\Application\\msedge.exe`),
    ];
  }
  return [
    ...fromEnv,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/snap/bin/chromium",
  ];
}

export function findChrome(): string | null {
  return chromeCandidates(process.platform, process.env).find((p) => existsSync(p)) ?? null;
}
