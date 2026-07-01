import type { EditorView } from "@codemirror/view";
import type { EditorState, TransactionSpec } from "@codemirror/state";
import type { ToHost } from "../../shared/messages";
import { toggleMarkSpec, insertLinkSpec } from "../markdownCommands";
import { handleImageTransfer } from "../imagePaste";
import { activeFormats, type ActionId } from "./activeFormats";
import { getRenderSettings } from "../render/settings";
import {
  setHeadingSpec, toggleBlockquoteSpec, toggleListSpec,
  insertTableSpec, insertHorizontalRuleSpec, wrapCodeBlockSpec,
} from "./commands";

interface ButtonDef {
  action: string;
  /** Codicon name (icon button) or undefined when `label` is used. */
  icon?: string;
  /** Text label (letter buttons: B, I, S, H1…). */
  label?: string;
  title: string;
  /** Per-platform key hint appended to `title` in parens (FIR-76). */
  shortcut?: { mac: string; other: string };
  /** Active-state id; omitted for inserts/wraps that are never lit. */
  active?: ActionId;
  /** Build the edit; undefined for the image button (handled specially). */
  spec?: (state: EditorState) => TransactionSpec;
  /** Custom click handler (image picker). */
  onClick?: (view: EditorView, post: (m: ToHost) => void) => void;
}

const SEP = "sep" as const;

const LAYOUT: Array<ButtonDef | typeof SEP> = [
  { action: "bold", label: "B", title: "Bold", shortcut: { mac: "⌘B", other: "Ctrl+B" }, active: "bold", spec: (s) => toggleMarkSpec(s, "**", "StrongEmphasis") },
  { action: "italic", label: "I", title: "Italic", shortcut: { mac: "⌘I", other: "Ctrl+I" }, active: "italic", spec: (s) => toggleMarkSpec(s, "*", "Emphasis") },
  { action: "strike", label: "S", title: "Strikethrough", active: "strike", spec: (s) => toggleMarkSpec(s, "~~", "Strikethrough") },
  { action: "code", icon: "code", title: "Inline code", shortcut: { mac: "⌘`", other: "Ctrl+`" }, active: "code", spec: (s) => toggleMarkSpec(s, "`", "InlineCode") },
  SEP,
  { action: "h1", label: "H1", title: "Heading 1", active: "h1", spec: (s) => setHeadingSpec(s, 1) },
  { action: "h2", label: "H2", title: "Heading 2", active: "h2", spec: (s) => setHeadingSpec(s, 2) },
  { action: "h3", label: "H3", title: "Heading 3", active: "h3", spec: (s) => setHeadingSpec(s, 3) },
  SEP,
  { action: "bullet", icon: "list-unordered", title: "Bullet list", active: "bullet", spec: (s) => toggleListSpec(s, "bullet") },
  { action: "ordered", icon: "list-ordered", title: "Numbered list", active: "ordered", spec: (s) => toggleListSpec(s, "ordered") },
  { action: "task", icon: "checklist", title: "Task list", active: "task", spec: (s) => toggleListSpec(s, "task") },
  SEP,
  { action: "blockquote", icon: "quote", title: "Blockquote", active: "blockquote", spec: toggleBlockquoteSpec },
  { action: "codeblock", icon: "symbol-namespace", title: "Code block", spec: wrapCodeBlockSpec },
  { action: "hr", icon: "horizontal-rule", title: "Horizontal rule", spec: insertHorizontalRuleSpec },
  SEP,
  { action: "link", icon: "link", title: "Link", shortcut: { mac: "⌘K", other: "Ctrl+K" }, spec: insertLinkSpec },
  { action: "image", icon: "device-camera", title: "Insert image", onClick: openImagePicker },
  { action: "table", icon: "table", title: "Insert table", spec: insertTableSpec },
  SEP,
  { action: "viewSource", icon: "markdown", title: "View Markdown source", shortcut: { mac: "⌥⌘E", other: "Ctrl+Shift+Alt+E" }, onClick: (_view, post) => post({ type: "openAsText" }) },
  SEP,
  { action: "exportHtml", icon: "globe", title: "Export to HTML", onClick: (_view, post) => post({ type: "exportHtml" }) },
  { action: "exportPdf", icon: "file-pdf", title: "Export to PDF", onClick: (_view, post) => post({ type: "exportPdf" }) },
  { action: "preview", icon: "open-preview", title: "Open Preview to the Side", onClick: (_view, post) => post({ type: "openPreview" }) },
];

function openImagePicker(view: EditorView, post: (m: ToHost) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";
  input.addEventListener("change", () => {
    const sel = view.state.selection.main;
    handleImageTransfer(input.files ? { files: input.files } : null, sel.from, sel.to,
      new Event("toolbar-image"), post);
    input.remove();
    view.focus();
  });
  input.addEventListener("cancel", () => input.remove());
  document.body.appendChild(input);
  input.click();
}

export function createToolbar(
  view: EditorView,
  post: (m: ToHost) => void
): { dom: HTMLElement; update: () => void } {
  const dom = document.createElement("div");
  dom.className = "rm-toolbar";
  dom.setAttribute("contenteditable", "false");
  const buttons: Array<{ el: HTMLElement; active?: ActionId }> = [];
  const isMac = getRenderSettings().isMac;

  for (const item of LAYOUT) {
    if (item === SEP) {
      const sep = document.createElement("span");
      sep.className = "rm-toolbar-sep";
      dom.appendChild(sep);
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = item.action;
    // Label lives on aria-label + a custom tooltip, not the native `title`:
    // native titles are slow (~1s) and fire inconsistently in webviews, so
    // the shortcut hint was often unreadable.
    const label = item.shortcut
      ? `${item.title} (${isMac ? item.shortcut.mac : item.shortcut.other})`
      : item.title;
    btn.setAttribute("aria-label", label);
    btn.dataset.tip = label;
    if (item.icon) {
      const i = document.createElement("span");
      i.className = `codicon codicon-${item.icon}`;
      btn.appendChild(i);
    } else {
      btn.textContent = item.label ?? "";
      btn.classList.add("rm-toolbar-text");
    }
    btn.addEventListener("click", () => {
      if (item.onClick) { item.onClick(view, post); return; }
      if (item.spec) view.dispatch(item.spec(view.state), { userEvent: "input" });
      view.focus();
    });
    dom.appendChild(btn);
    buttons.push({ el: btn, active: item.active });
  }

  // Clicks must not steal the selection from the document.
  dom.addEventListener("mousedown", (e) => e.preventDefault());

  // Custom tooltip: a single element the buttons share. Replaces the native
  // `title` attribute, which is slow to appear and fires unreliably in webviews.
  const tip = document.createElement("div");
  tip.className = "rm-toolbar-tip";
  tip.setAttribute("role", "tooltip");
  dom.appendChild(tip);
  let tipTimer: ReturnType<typeof setTimeout> | undefined;
  const hideTip = () => {
    if (tipTimer) { clearTimeout(tipTimer); tipTimer = undefined; }
    tip.classList.remove("show");
  };
  const showTip = (el: HTMLElement) => {
    const label = el.dataset.tip;
    if (!label) return;
    tip.textContent = label;
    tip.style.left = `${el.offsetLeft}px`;
    tip.style.top = `${el.offsetTop + el.offsetHeight + 4}px`;
    tip.classList.add("show");
  };
  for (const b of buttons) {
    b.el.addEventListener("mouseenter", () => {
      if (tipTimer) clearTimeout(tipTimer);
      tipTimer = setTimeout(() => showTip(b.el), 150);
    });
    b.el.addEventListener("mouseleave", hideTip);
    b.el.addEventListener("click", hideTip);
  }

  const update = () => {
    const set = activeFormats(view.state);
    for (const b of buttons) {
      if (b.active) b.el.classList.toggle("on", set.has(b.active));
    }
  };

  return { dom, update };
}
