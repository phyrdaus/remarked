import esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";

const watch = process.argv.includes("--watch");

// FIR-78: enforce the host/webview bundle boundary at build time. The webview
// bundle must never import `vscode`, node builtins, or host-only modules
// (src/preview, src/editor, src/export) — a violation would only surface at
// runtime otherwise. Attached to the webview build only; the host build (below)
// legitimately imports vscode/node.
const HOST_DIRS = ["src/preview", "src/editor", "src/export"];
const rel = (p) => path.relative(process.cwd(), p);
const webviewBoundaryPlugin = {
  name: "webview-boundary",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // Police only our own source; dependencies manage their own imports, and
      // the browser platform already errors on unresolved node builtins.
      if (!args.importer || args.importer.includes("node_modules")) return null;
      const spec = args.path;
      if (spec === "vscode" || spec.startsWith("node:") || builtinModules.includes(spec)) {
        return {
          errors: [{ text: `webview bundle must not import "${spec}" (host/node only) — ${rel(args.importer)}` }],
        };
      }
      if (spec.startsWith(".")) {
        const resolved = rel(path.resolve(args.resolveDir, spec)).split(path.sep).join("/");
        if (HOST_DIRS.some((d) => resolved === d || resolved.startsWith(d + "/"))) {
          return {
            errors: [{ text: `webview bundle must not import host-only module "${resolved}" — ${rel(args.importer)}` }],
          };
        }
      }
      return null;
    });
  },
};

// Minify only for production packaging, never in --watch: dev rebuilds stay
// fast and the output readable, while the shipped bundle drops ~45% of its
// bytes (VSIX ~2.66 -> ~2.10 MB). Behavior is unchanged — esbuild renames only
// locals and strips whitespace/dead code; no code here reads runtime identifier
// names (all `.name` reads are Lezer node-type strings, not JS identifiers).
const minify = !watch;

const builds = [
  {
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["vscode"],
    sourcemap: true,
    minify,
  },
  {
    entryPoints: { main: "src/webview/main.ts", preview: "src/webview/preview/main.ts" },
    outdir: "dist/webview",
    bundle: true,
    platform: "browser",
    format: "esm",
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    sourcemap: true,
    minify,
    plugins: [webviewBoundaryPlugin],
  },
];

function copyAssets() {
  mkdirSync("dist/webview", { recursive: true });
  cpSync("node_modules/katex/dist/katex.min.css", "dist/webview/katex.min.css");
  // Ship only woff2: katex.min.css lists woff2 first in every @font-face, and
  // the VS Code webview is always Chromium (woff2-capable), so the .woff/.ttf
  // fallbacks are never requested. Dropping them removes ~40 unused font files.
  cpSync("node_modules/katex/dist/fonts", "dist/webview/fonts", {
    recursive: true,
    filter: (src) => statSync(src).isDirectory() || src.endsWith(".woff2"),
  });
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
