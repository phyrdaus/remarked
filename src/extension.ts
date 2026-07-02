import * as vscode from "vscode";
import { RemarkedEditorProvider } from "./editor/remarkedEditorProvider";
import { toggleSource } from "./commands/toggleSource";
import { jumpToHeading } from "./commands/jumpToHeading";
import { toggleDefaultEditor } from "./commands/toggleDefaultEditor";
import { WordCountStatus } from "./workbench/wordCountStatus";
import { exportHtmlCommand } from "./export/exportService";
import { exportPdfCommand } from "./export/pdfExport";
import { PreviewPanelManager } from "./preview/previewPanel";

export interface RemarkedTestApi {
  postToLatestWebview: RemarkedEditorProvider["postToLatestWebview"];
  onTestMessage: RemarkedEditorProvider["onTestMessage"];
}

export function activate(context: vscode.ExtensionContext): RemarkedTestApi | undefined {
  const provider = new RemarkedEditorProvider(context);
  const preview = new PreviewPanelManager(context.extensionUri);
  context.subscriptions.push(
    new WordCountStatus(provider),
    vscode.window.registerCustomEditorProvider(RemarkedEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
    vscode.commands.registerCommand("remarked.toggleSource", toggleSource),
    vscode.commands.registerCommand("remarked.toggleFocusMode", () => provider.toggleFocusMode()),
    vscode.commands.registerCommand("remarked.toggleTypewriterMode", () => provider.toggleTypewriterMode()),
    vscode.commands.registerCommand("remarked.jumpToHeading", () => jumpToHeading(provider)),
    vscode.commands.registerCommand("remarked.toggleDefaultEditor", toggleDefaultEditor),
    vscode.commands.registerCommand("remarked.exportHtml", () => exportHtmlCommand(provider)),
    vscode.commands.registerCommand("remarked.exportPdf", () => exportPdfCommand(provider)),
    { dispose: () => preview.dispose() },
    vscode.commands.registerCommand("remarked.openPreview", () => {
      const doc = provider.activeDocument ?? vscode.window.activeTextEditor?.document;
      if (doc) preview.open(doc);
    }),
    provider.onDidRequestPreviewLine(({ document, line }) => preview.syncToLine(document, line)),
    preview.onDidRequestEditorLine(({ document, line }) => provider.revealEditorLine(document, line)),
    // FIR-81: inert target for the formatting-shortcut absorber keybindings.
    // Formatting itself is handled inside the webview by CodeMirror's keymap;
    // this command exists only so the editor-scoped keybindings shadow the
    // workbench defaults (e.g. Ctrl/Cmd+B = toggle sidebar) without them also
    // firing. A registered no-op keeps resolution silent (no "command not
    // found") — it is intentionally not exposed in contributes.commands.
    vscode.commands.registerCommand("remarked.noop", () => {})
  );
  if (context.extensionMode === vscode.ExtensionMode.Test) {
    return {
      postToLatestWebview: provider.postToLatestWebview.bind(provider),
      onTestMessage: provider.onTestMessage,
    };
  }
  return undefined;
}

export function deactivate(): void {}
