import * as vscode from "vscode";
import { renderMarkdown } from "./renderMarkdown";
import { assembleHtml, fillMermaidSlots, replaceImageSrcs } from "./assembleHtml";
import { EXPORT_CSS } from "./exportCss";
import { rewriteKatexCss } from "./katexCss";
import { uniqueName } from "./uniqueName";
import type { RemarkedEditorProvider } from "../editor/remarkedEditorProvider";

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

function mimeForPath(p: string): string | null {
  const m = /\.[^.]+$/.exec(p.toLowerCase());
  return m ? IMAGE_MIME[m[0]] ?? null : null;
}

async function readDocRelative(document: vscode.TextDocument, src: string): Promise<Uint8Array | null> {
  try {
    const uri = src.startsWith("/")
      ? vscode.Uri.file(decodeURI(src))
      : vscode.Uri.joinPath(document.uri, "..", decodeURI(src));
    return await vscode.workspace.fs.readFile(uri);
  } catch {
    return null; // missing image: leave the original src in place
  }
}

async function inlineKatexCss(extensionUri: vscode.Uri): Promise<string | null> {
  try {
    const dist = vscode.Uri.joinPath(extensionUri, "dist", "webview");
    const cssBytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dist, "katex.min.css"));
    const fonts = vscode.Uri.joinPath(dist, "fonts");
    const cache = new Map<string, Uint8Array | null>();
    const css = new TextDecoder().decode(cssBytes);
    // rewriteKatexCss is sync; pre-read every woff2 it will ask for.
    for (const m of css.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)) {
      try {
        cache.set(m[1], await vscode.workspace.fs.readFile(vscode.Uri.joinPath(fonts, m[1])));
      } catch {
        cache.set(m[1], null);
      }
    }
    return rewriteKatexCss(css, (file) => cache.get(file) ?? null);
  } catch (err) {
    console.error("remarked: could not inline katex css", err);
    return null; // math renders unstyled rather than failing the export
  }
}

/** The full pipeline up to (but not including) writing the output file. */
export async function buildExportHtml(
  document: vscode.TextDocument,
  provider: RemarkedEditorProvider,
  opts: { embedImages: boolean; assetTarget?: vscode.Uri; assetDirName?: string }
): Promise<string> {
  const rendered = renderMarkdown(document.getText());
  let html = rendered.html;

  const svgs = await provider.renderMermaidSvgs(document, rendered.mermaidSources);
  html = fillMermaidSlots(html, rendered.mermaidSources, svgs);

  const replacements = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const src of rendered.imageSrcs) {
    const bytes = await readDocRelative(document, src);
    const mime = mimeForPath(src);
    if (!bytes || !mime) continue;
    if (opts.embedImages) {
      replacements.set(src, `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`);
    } else if (opts.assetTarget && opts.assetDirName) {
      const encodedName = src.split("/").pop()!;
      // Disk gets the DECODED name; the URL keeps the ENCODED segment — the
      // browser decodes when resolving, so the two must agree this way around.
      const name = uniqueName(decodeURI(encodedName), usedNames);
      await vscode.workspace.fs.createDirectory(opts.assetTarget);
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(opts.assetTarget, name), bytes);
      replacements.set(src, `${opts.assetDirName}/${encodeURI(name)}`);
    }
  }
  html = replaceImageSrcs(html, replacements);

  const extraCss: string[] = [];
  if (html.includes("katex")) {
    const katexCss = await inlineKatexCss(provider.extensionUri);
    if (katexCss) extraCss.push(katexCss);
  }

  const title = rendered.title ?? document.uri.path.split("/").pop() ?? "Document";
  return assembleHtml({ title, bodyHtml: html, css: EXPORT_CSS, extraCss });
}

export async function exportHtmlCommand(provider: RemarkedEditorProvider): Promise<void> {
  const document = provider.activeDocument;
  if (!document) return;
  const base = document.uri.path.replace(/\.(md|markdown)$/i, "");
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${base}.html`),
    filters: { HTML: ["html"] },
  });
  if (!target) return;

  const embedImages = vscode.workspace
    .getConfiguration("remarked")
    .get<boolean>("export.embedImages", true);
  const outName = target.path.split("/").pop()!.replace(/\.html$/i, "");
  const assetDirName = `${outName}_files`;
  const assetTarget = vscode.Uri.joinPath(target, "..", assetDirName);

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Remarked: exporting HTML…" },
      async () => {
        const html = await buildExportHtml(document, provider, {
          embedImages,
          assetTarget,
          assetDirName,
        });
        await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(html));
      }
    );
    const open = await vscode.window.showInformationMessage(
      `Remarked: exported ${target.path.split("/").pop()}`,
      "Open in Browser"
    );
    if (open) void vscode.env.openExternal(target);
  } catch (err) {
    console.error("remarked: html export failed", err);
    void vscode.window.showErrorMessage(
      `Remarked: export failed (${err instanceof Error ? err.message : String(err)})`
    );
  }
}
