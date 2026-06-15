import { Annotation, EditorState, StateEffect, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage, markdownKeymap as markdownLanguageKeymap } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { mathExtension } from "./render/mathExtension";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { computeReplacement, type Replacement } from "../shared/replace";
import type { ToHost, ToWebview } from "../shared/messages";
import { baseTheme } from "./render/baseTheme";
import { livePlugin } from "./render/livePlugin";
import { markdownKeymap } from "./markdownCommands";
import { setDocBaseUri, setRootBaseUri } from "./render/imageBase";
import { setRenderSettings, getRenderSettings } from "./render/settings";
import { focusCompartment, typewriterCompartment, focusMode, typewriterMode } from "./modes";
import { renderLargeFilePrompt } from "./largeFile";
import { imagePasteExtension, handleImageSaved } from "./imagePaste";
import { handleExportRenderMermaid } from "./exportMermaid";
import { renderMermaidSvg } from "./render/mermaid";
import { createToolbar } from "./toolbar/view";

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscode = acquireVsCodeApi();
const post = (msg: ToHost) => vscode.postMessage(msg);

/** Marks transactions that originate from a host sync (must not echo back). */
export const remoteSync = Annotation.define<boolean>();

let view: EditorView | undefined;
/** Monotonic counter for edits we send; syncs older than this are stale. */
let localVersion = 0;

function createView(text: string): void {
  const parent = document.getElementById("editor")!;
  parent.replaceChildren();
  const state = EditorState.create({
    doc: text,
    extensions: [
      history(),
      markdownKeymap,
      keymap.of(markdownLanguageKeymap),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: false,
        extensions: getRenderSettings().math ? [mathExtension] : [],
      }),
      EditorView.lineWrapping,
      baseTheme,
      livePlugin,
      focusCompartment.of([]),
      typewriterCompartment.of([]),
      imagePasteExtension(post),
      EditorView.domEventHandlers({
        mousedown(event, view) {
          if (event.button !== 0) return false;
          if (!(event.metaKey || event.ctrlKey)) return false;
          if (!(event.target instanceof HTMLElement) || !event.target.closest(".cm-rm-link")) return false;
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) return false;
          const tree = syntaxTree(view.state);
          for (let n: SyntaxNode | null = tree.resolveInner(pos, 1); n; n = n.parent) {
            if (n.name === "Link") {
              const url = n.getChild("URL");
              if (url) {
                let href = view.state.doc.sliceString(url.from, url.to);
                if (href.startsWith("<") && href.endsWith(">")) href = href.slice(1, -1);
                post({ type: "openLink", href });
                event.preventDefault();
                return true;
              }
            }
          }
          return false;
        },
      }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        // Assumes one transaction per update (true with the default dispatch —
        // CM throws on reentrant updates). If batching/dispatchTransactions is
        // ever introduced, mixed updates need per-transaction handling instead.
        if (update.transactions.some((tr) => tr.annotation(remoteSync))) return;
        const changes: Replacement[] = [];
        update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          changes.push({ from: fromA, to: toA, insert: inserted.toString() });
        });
        post({ type: "edit", changes, version: ++localVersion });
      }),
    ],
  });
  view = new EditorView({ state, parent });
  view.focus();
  if (getRenderSettings().toolbar) {
    const bar = createToolbar(view, post);
    parent.before(bar.dom); // toolbar sits above #editor in the body flex column
    view.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.updateListener.of((u) => {
          if (u.docChanged || u.selectionSet) bar.update();
        })
      ),
    });
    bar.update();
  }
}

window.addEventListener("message", (event) => {
  const msg = event.data as ToWebview;
  switch (msg.type) {
    case "init":
      setDocBaseUri(msg.docBaseUri);
      setRootBaseUri(msg.rootBaseUri);
      setRenderSettings(msg.settings);
      if (!view) createView(msg.text);
      break;
    case "sync": {
      if (!view) return;
      // Stale: computed before one of our in-flight edits was applied.
      // A newer sync always follows once the host catches up.
      if (msg.editVersion < localVersion) return;
      const replacement = computeReplacement(view.state.doc.toString(), msg.text);
      // Null means no-op: the echo of our own edit or an already-converged sync.
      if (!replacement) return;
      view.dispatch({
        changes: replacement,
        annotations: [remoteSync.of(true), Transaction.addToHistory.of(false)],
      });
      break;
    }
    case "test:dispatchEdit":
      // Drives the REAL user-edit path: dispatch -> updateListener -> post edit.
      if (view) view.dispatch({ changes: msg.changes, userEvent: "input" });
      break;
    case "test:getText":
      if (view) post({ type: "test:text", text: view.state.doc.toString() });
      break;
    case "setMode":
      if (!view) return;
      view.dispatch({
        effects: [
          ...(msg.focus === undefined ? [] : [focusCompartment.reconfigure(msg.focus ? focusMode : [])]),
          ...(msg.typewriter === undefined ? [] : [typewriterCompartment.reconfigure(msg.typewriter ? typewriterMode : [])]),
        ],
      });
      break;
    case "largeFile":
      if (!view) renderLargeFilePrompt(document.getElementById("editor")!, msg.bytes, post);
      break;
    case "imageSaved":
      if (view) handleImageSaved(view, msg);
      break;
    case "revealPos": {
      if (!view) return;
      // The doc may have changed while the QuickPick was open — clamp, don't throw.
      const pos = Math.min(msg.pos, view.state.doc.length);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      view.focus();
      break;
    }
    case "export:renderMermaid":
      void handleExportRenderMermaid(msg, renderMermaidSvg, post);
      break;
  }
});

post({ type: "ready" });
