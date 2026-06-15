import esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");

const builds = [
  {
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["vscode"],
    sourcemap: true,
  },
  {
    entryPoints: { main: "src/webview/main.ts" },
    outdir: "dist/webview",
    bundle: true,
    platform: "browser",
    format: "esm",
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    sourcemap: true,
  },
];

function copyAssets() {
  mkdirSync("dist/webview", { recursive: true });
  cpSync("node_modules/katex/dist/katex.min.css", "dist/webview/katex.min.css");
  cpSync("node_modules/katex/dist/fonts", "dist/webview/fonts", { recursive: true });
  cpSync("node_modules/@vscode/codicons/dist/codicon.css", "dist/webview/codicon.css");
  cpSync("node_modules/@vscode/codicons/dist/codicon.ttf", "dist/webview/codicon.ttf");
}

// esbuild never cleans outdir: hashed chunks accumulate across builds and
// would silently bloat the VSIX. Wipe the webview output before building.
rmSync("dist/webview", { recursive: true, force: true });

if (watch) {
  const contexts = await Promise.all(builds.map((b) => esbuild.context(b)));
  copyAssets();
  await Promise.all(contexts.map((c) => c.watch()));
  console.log("watching…");
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
  copyAssets();
  console.log("build complete");
}
