import * as vscode from "vscode";
import { RemarkedEditorProvider } from "./editor/remarkedEditorProvider";
import { toggleSource } from "./commands/toggleSource";
import { jumpToHeading } from "./commands/jumpToHeading";
import { toggleDefaultEditor } from "./commands/toggleDefaultEditor";
import { WordCountStatus } from "./workbench/wordCountStatus";
import { exportHtmlCommand } from "./export/exportService";
import { exportPdfCommand } from "./export/pdfExport";

export interface RemarkedTestApi {
  postToLatestWebview: RemarkedEditorProvider["postToLatestWebview"];
  onTestMessage: RemarkedEditorProvider["onTestMessage"];
}

export function activate(context: vscode.ExtensionContext): RemarkedTestApi | undefined {
  const provider = new RemarkedEditorProvider(context);
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
    vscode.commands.registerCommand("remarked.exportPdf", () => exportPdfCommand(provider))
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
