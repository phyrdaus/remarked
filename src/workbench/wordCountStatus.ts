import * as vscode from "vscode";
import type { RemarkedEditorProvider } from "../editor/remarkedEditorProvider";
import { wordCountLabel } from "../shared/wordCount";

/** Live word count + reading time for the active Remarked editor. */
export class WordCountStatus implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly subscriptions: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly provider: RemarkedEditorProvider) {
    this.item = vscode.window.createStatusBarItem("remarked.wordCount", vscode.StatusBarAlignment.Right, 100);
    this.item.name = "Remarked Word Count";
    this.item.tooltip = "Words · estimated reading time";
    this.subscriptions.push(
      provider.onDidChangeActiveDocument(() => this.refresh()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === this.provider.activeDocument) this.scheduleRefresh();
      })
    );
    this.refresh();
  }

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), 300);
  }

  private refresh(): void {
    const document = this.provider.activeDocument;
    if (!document) {
      this.item.hide();
      return;
    }
    this.item.text = `$(book) ${wordCountLabel(document.getText())}`;
    this.item.show();
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.item.dispose();
    for (const s of this.subscriptions) s.dispose();
  }
}
