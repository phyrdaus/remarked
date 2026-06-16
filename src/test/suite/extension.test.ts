import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import type { RemarkedTestApi } from "../../extension";

const FIXTURE = "# Title\n\nSome *markdown* text.\n";

function makeTempMarkdownFile(): vscode.Uri {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "remarked-")), "doc.md");
  fs.writeFileSync(file, FIXTURE, "utf8");
  return vscode.Uri.file(file);
}

suite("Remarked foundation", () => {
  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("extension activates and registers the toggle command", async () => {
    const ext = vscode.extensions.getExtension("phyr.remarked");
    assert.ok(ext, "extension not found");
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("remarked.toggleSource"));
  });

  test("opens a markdown file with the Remarked custom editor", async () => {
    const uri = makeTempMarkdownFile();
    await vscode.commands.executeCommand("vscode.openWith", uri, "remarked.editor");
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    assert.ok(tab?.input instanceof vscode.TabInputCustom, "active tab is not a custom editor");
    assert.strictEqual((tab.input as vscode.TabInputCustom).viewType, "remarked.editor");
  });

  test("document edits round-trip and save while custom editor is open", async () => {
    const uri = makeTempMarkdownFile();
    await vscode.commands.executeCommand("vscode.openWith", uri, "remarked.editor");
    const document = await vscode.workspace.openTextDocument(uri);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(2), document.positionAt(7)), "Hello");
    assert.ok(await vscode.workspace.applyEdit(edit), "edit rejected");
    assert.strictEqual(document.getText(), "# Hello\n\nSome *markdown* text.\n");

    assert.ok(await document.save(), "save failed");
    assert.deepStrictEqual(
      fs.readFileSync(uri.fsPath),
      Buffer.from("# Hello\n\nSome *markdown* text.\n", "utf8")
    );
  });

  test("toggle command reopens the document as a text editor and back", async () => {
    const uri = makeTempMarkdownFile();
    await vscode.commands.executeCommand("vscode.openWith", uri, "remarked.editor");

    await vscode.commands.executeCommand("remarked.toggleSource");
    let tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    assert.ok(tab?.input instanceof vscode.TabInputText, "expected plain text editor after toggle");

    await vscode.commands.executeCommand("remarked.toggleSource");
    tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    assert.ok(tab?.input instanceof vscode.TabInputCustom, "expected custom editor after second toggle");
  });

  async function until(cond: () => boolean, ms = 5000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
      if (Date.now() - start > ms) throw new Error("condition not met in time");
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async function getTestApi(): Promise<RemarkedTestApi> {
    const ext = vscode.extensions.getExtension("phyr.remarked");
    assert.ok(ext);
    const api = (await ext.activate()) as RemarkedTestApi | undefined;
    assert.ok(api, "test API not exported — extensionMode is not Test?");
    return api;
  }

  /** Wait until the webview answers a test:getText probe (i.e., it is initialized). */
  async function webviewReady(api: RemarkedTestApi): Promise<void> {
    let ready = false;
    const sub = api.onTestMessage((m) => {
      if (m.type === "test:text") ready = true;
    });
    try {
      await until(() => {
        api.postToLatestWebview({ type: "test:getText" });
        return ready;
      });
    } finally {
      sub.dispose();
    }
  }

  test("webview edit flows through the real sync path to the TextDocument", async () => {
    const api = await getTestApi();
    const uri = makeTempMarkdownFile();
    await vscode.commands.executeCommand("vscode.openWith", uri, "remarked.editor");
    const document = await vscode.workspace.openTextDocument(uri);
    // Wait for the webview to come up (init round-trip), then drive a real edit.
    await webviewReady(api);
    api.postToLatestWebview({ type: "test:dispatchEdit", changes: [{ from: 0, to: 0, insert: "X" }] });
    await until(() => document.getText().startsWith("X"));
    assert.ok(document.getText().startsWith("X# Title"));
  });

  test("host edits sync down into the webview", async () => {
    const api = await getTestApi();
    const uri = makeTempMarkdownFile();
    await vscode.commands.executeCommand("vscode.openWith", uri, "remarked.editor");
    const document = await vscode.workspace.openTextDocument(uri);
    await webviewReady(api);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(2), document.positionAt(7)), "Synced");
    assert.ok(await vscode.workspace.applyEdit(edit));

    let webviewText = "";
    const sub = api.onTestMessage((m) => {
      if (m.type === "test:text") webviewText = m.text;
    });
    try {
      await until(() => {
        api.postToLatestWebview({ type: "test:getText" });
        return webviewText.startsWith("# Synced");
      });
    } finally {
      sub.dispose();
    }
    assert.ok(webviewText.startsWith("# Synced"));
  });

  test("table documents round-trip byte-identically through the webview", async () => {
    const TABLE_FIXTURE = "| a | b |\n| --- | --- |\n| 1 | 2 |\n";
    const api = await getTestApi();
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "remarked-")), "table.md");
    fs.writeFileSync(file, TABLE_FIXTURE, "utf8");
    const uri = vscode.Uri.file(file);
    await vscode.commands.executeCommand("vscode.openWith", uri, "remarked.editor");
    const document = await vscode.workspace.openTextDocument(uri);
    await webviewReady(api);
    // Edit outside the table through the real webview sync path; the table
    // bytes must come through completely untouched.
    api.postToLatestWebview({
      type: "test:dispatchEdit",
      changes: [{ from: 0, to: 0, insert: "intro\n\n" }],
    });
    await until(() => document.getText().startsWith("intro"));
    assert.strictEqual(document.getText(), "intro\n\n" + TABLE_FIXTURE);
  });

  test("plan 5 commands are registered", async () => {
    const ext = vscode.extensions.getExtension("phyr.remarked");
    assert.ok(ext);
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    for (const cmd of ["remarked.jumpToHeading", "remarked.toggleDefaultEditor"]) {
      assert.ok(commands.includes(cmd), `${cmd} not registered`);
    }
  });

  test("plan 5 settings expose their defaults", () => {
    const cfg = vscode.workspace.getConfiguration("remarked");
    assert.strictEqual(cfg.get("imageFolder"), "assets");
    assert.strictEqual(cfg.get("customCss"), "");
    assert.strictEqual(cfg.get("math.enabled"), true);
    assert.strictEqual(cfg.get("mermaid.enabled"), true);
    assert.strictEqual(cfg.get("largeFileSizeMb"), 2);
  });

  test("plan 6 commands are registered", async () => {
    const ext = vscode.extensions.getExtension("phyr.remarked");
    assert.ok(ext);
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    for (const cmd of ["remarked.exportHtml", "remarked.exportPdf"]) {
      assert.ok(commands.includes(cmd), `${cmd} not registered`);
    }
  });

  test("untrusted-workspace capability and export setting are declared", () => {
    const ext = vscode.extensions.getExtension("phyr.remarked");
    assert.ok(ext);
    const pkg = ext.packageJSON as {
      capabilities?: { untrustedWorkspaces?: { restrictedConfigurations?: string[] } };
      version: string;
    };
    assert.deepStrictEqual(pkg.capabilities?.untrustedWorkspaces?.restrictedConfigurations, [
      "remarked.customCss",
      "remarked.imageFolder",
    ]);
    assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "version is not valid semver");
    assert.strictEqual(
      vscode.workspace.getConfiguration("remarked").get("export.embedImages"),
      true
    );
  });
});
