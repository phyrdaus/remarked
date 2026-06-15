import * as vscode from "vscode";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildExportHtml } from "./exportService";
import { findChrome } from "./chromeFinder";
import type { RemarkedEditorProvider } from "../editor/remarkedEditorProvider";

function runChrome(chrome: string, args: string[]): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    execFile(chrome, args, { timeout: 60000 }, (err, _stdout, stderr) => {
      resolve({ ok: !err, stderr: String(stderr ?? "") });
    });
  });
}

export async function exportPdfCommand(provider: RemarkedEditorProvider): Promise<void> {
  const document = provider.activeDocument;
  if (!document) return;

  const base = document.uri.path.replace(/\.(md|markdown)$/i, "");
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${base}.pdf`),
    filters: { PDF: ["pdf"] },
  });
  if (!target) return;

  try {
    const outcome = await vscode.window.withProgress<"printed" | "fallback">(
      { location: vscode.ProgressLocation.Notification, title: "Remarked: exporting PDF…" },
      async () => {
        // PDFs always embed images: the temp HTML must be self-contained.
        const html = await buildExportHtml(document, provider, { embedImages: true });
        const htmlPath = join(tmpdir(), `remarked-export-${Date.now()}.html`);
        const htmlUri = vscode.Uri.file(htmlPath);
        await vscode.workspace.fs.writeFile(htmlUri, new TextEncoder().encode(html));

        const chrome = findChrome();
        if (!chrome) {
          // Spec fallback: no compatible browser → open the HTML and hint at
          // the browser's print dialog.
          void vscode.env.openExternal(htmlUri);
          void vscode.window.showInformationMessage(
            "Remarked: no Chrome/Edge found — opened the export in your browser; use Print → Save as PDF."
          );
          return "fallback";
        }

        // Delete any pre-existing file so a silent Chrome no-op can't false-pass
        // on a stale PDF from a previous export.
        await vscode.workspace.fs.delete(target).then(undefined, () => undefined);

        const baseArgs = [
          "--disable-gpu",
          "--no-pdf-header-footer",
          `--print-to-pdf=${target.fsPath}`,
          htmlUri.toString(),
        ];
        // Chrome 112+ wants --headless=new; older builds only know --headless.
        let result = await runChrome(chrome, ["--headless=new", ...baseArgs]);
        if (!result.ok) result = await runChrome(chrome, ["--headless", ...baseArgs]);

        await vscode.workspace.fs.delete(htmlUri).then(undefined, () => undefined);

        // Chrome can exit 0 without writing the file (historical headless bugs;
        // profile interference). Verify the output actually materialised.
        if (result.ok) {
          const produced = await vscode.workspace.fs.stat(target).then(() => true, () => false);
          if (!produced) result = { ok: false, stderr: "Chrome exited cleanly but wrote no PDF" };
        }
        if (!result.ok) {
          throw new Error(`Chrome failed to print (${result.stderr.slice(0, 200) || "unknown error"})`);
        }

        return "printed";
      }
    );
    if (outcome === "printed") {
      const reveal = await vscode.window.showInformationMessage(
        `Remarked: exported ${target.path.split("/").pop()}`,
        "Open"
      );
      if (reveal) void vscode.env.openExternal(target);
    }
  } catch (err) {
    console.error("remarked: pdf export failed", err);
    void vscode.window.showErrorMessage(
      `Remarked: PDF export failed (${err instanceof Error ? err.message : String(err)})`
    );
  }
}
