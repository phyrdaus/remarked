import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Manifest contract for the formatting-shortcut "absorber" keybindings (FIR-81).
 *
 * CodeMirror's `markdownKeymap` handles Mod-b/i/`/k inside the webview, but the
 * same keystroke is re-dispatched to the workbench, where the global default
 * (e.g. Cmd+B = toggle sidebar) also fires. We shadow those defaults with
 * editor-scoped keybindings bound to an inert `remarked.noop` command so the
 * global action never runs while the Remarked editor is focused.
 *
 * The scope is `activeCustomEditorId == 'remarked.editor' && remarked.editorFocused`.
 * The `activeCustomEditorId` half alone stays true whenever the Remarked tab is
 * the active editor — even if focus is in the Explorer — which would wrongly
 * absorb the global shortcut there. The `remarked.editorFocused` half (a context
 * key the host drives from the webview's focus/blur) narrows it to real focus.
 *
 * VS Code keybinding *resolution* is pure runtime and not unit-testable — this
 * only locks the declaration so the bindings can't be silently dropped or their
 * scope loosened. Behaviour is verified by the manual EDH acceptance pass.
 */
interface Keybinding {
  command: string;
  key?: string;
  mac?: string;
  when?: string;
}

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  contributes: { keybindings: Keybinding[] };
};

// Mirrors src/webview/markdownCommands.ts markdownKeymap (Mod-b/i/`/k).
const SHORTCUTS = [
  { name: "bold", ctrl: "ctrl+b", mac: "cmd+b" },
  { name: "italic", ctrl: "ctrl+i", mac: "cmd+i" },
  { name: "inline code", ctrl: "ctrl+`", mac: "cmd+`" },
  { name: "link", ctrl: "ctrl+k", mac: "cmd+k" },
];

const EDITOR_SCOPE = "activeCustomEditorId == 'remarked.editor'";
const FOCUS_SCOPE = "remarked.editorFocused";

describe("formatting-shortcut absorber keybindings (FIR-81)", () => {
  for (const s of SHORTCUTS) {
    it(`shadows the global ${s.name} shortcut, scoped to the focused Remarked editor`, () => {
      const binding = pkg.contributes.keybindings.find(
        (b) => b.key === s.ctrl && b.mac === s.mac
      );
      expect(binding, `no keybinding for ${s.ctrl}/${s.mac}`).toBeDefined();
      expect(binding!.command).toBe("remarked.noop");
      // Must be tight enough that the global default still works elsewhere:
      // the active-editor scope AND real webview focus.
      expect(binding!.when).toContain(EDITOR_SCOPE);
      expect(binding!.when).toContain(FOCUS_SCOPE);
    });
  }

  it("binds every absorber to the inert remarked.noop (no accidental side effects)", () => {
    const absorbers = pkg.contributes.keybindings.filter((b) =>
      SHORTCUTS.some((s) => b.key === s.ctrl && b.mac === s.mac)
    );
    expect(absorbers).toHaveLength(SHORTCUTS.length);
    for (const b of absorbers) expect(b.command).toBe("remarked.noop");
  });
});
