import { EditorView } from "@codemirror/view";

/**
 * Document-like typography. Colors intentionally lean on the VS Code theme
 * variables already inherited by the webview body; the full adaptive palette
 * derivation is Plan 4.
 */
export const baseTheme = EditorView.theme({
  "&": {
    fontSize: "15px",
    fontFamily:
      "'Avenir Next', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif",
  },
  ".cm-content": {
    maxWidth: "46em",
    margin: "0 auto",
    padding: "2.5em 2em 60vh",
    lineHeight: "1.75",
    caretColor: "var(--vscode-editorCursor-foreground, #528bff)",
  },
  ".cm-line": { padding: "0" },
  "&.cm-focused": { outline: "none" },
  ".cm-rm-heading": { fontWeight: "700", lineHeight: "1.3" },
  ".cm-rm-h1": { fontSize: "1.9em", margin: "0.6em 0 0.3em" },
  ".cm-rm-h2": { fontSize: "1.5em", margin: "0.6em 0 0.25em" },
  ".cm-rm-h3": { fontSize: "1.25em" },
  ".cm-rm-h4": { fontSize: "1.1em" },
  ".cm-rm-h5": { fontSize: "1em" },
  ".cm-rm-h6": { fontSize: "0.9em", opacity: "0.8" },
  ".cm-rm-strong": { fontWeight: "700" },
  ".cm-rm-em": { fontStyle: "italic" },
  ".cm-rm-strike": { textDecoration: "line-through", opacity: "0.7" },
  ".cm-rm-inline-code": {
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: "0.88em",
    background: "var(--vscode-textCodeBlock-background, rgba(128,128,128,.15))",
    borderRadius: "3px",
    padding: "0.1em 0.3em",
  },
  ".cm-rm-link": {
    color: "var(--vscode-textLink-foreground, #4d7cc1)",
    textDecoration: "none",
    cursor: "pointer",
  },
  ".cm-rm-marker": { opacity: "0.45" },
  ".cm-rm-quote": {
    borderLeft: "3px solid var(--vscode-textBlockQuote-border, #888)",
    paddingLeft: "1em",
    opacity: "0.85",
    fontStyle: "italic",
  },
  ".cm-rm-bullet": { color: "var(--vscode-textLink-foreground, #4d7cc1)" },
  ".cm-rm-hr": {
    border: "none",
    borderTop: "2px solid var(--vscode-widget-border, #555)",
    margin: "0.4em 0",
  },
  ".cm-rm-dim": { opacity: "0.3", transition: "opacity 0.2s" },
  ".cm-rm-checkbox": { verticalAlign: "middle", margin: "0 0.4em 0.15em 0", cursor: "pointer" },
  ".cm-rm-task-done": { opacity: "0.6", textDecoration: "line-through" },
  ".cm-rm-codeblock": {
    background: "var(--vscode-textCodeBlock-background, rgba(128,128,128,.12))",
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: "0.88em",
    lineHeight: "1.6",
  },
  ".cm-rm-image img": { maxWidth: "100%", borderRadius: "3px", verticalAlign: "text-bottom" },
  ".cm-rm-image-error": {
    color: "var(--vscode-errorForeground, #c66)",
    fontSize: "0.85em",
    border: "1px dashed currentColor",
    borderRadius: "3px",
    padding: "0.1em 0.4em",
  },
  ".cm-rm-math": { color: "inherit" },
  ".cm-rm-math-block": { textAlign: "center", padding: "0.4em 0" },
  ".cm-rm-math-error": {
    color: "var(--vscode-errorForeground, #c66)",
    fontFamily: "Menlo, monospace",
    fontSize: "0.85em",
  },
  ".cm-rm-mermaid": { textAlign: "center", padding: "0.5em 0" },
  ".cm-rm-mermaid svg": { maxWidth: "100%" },
  ".cm-rm-mermaid-error": {
    color: "var(--vscode-errorForeground, #c66)",
    fontFamily: "Menlo, monospace",
    fontSize: "0.85em",
  },
  ".cm-rm-table-wrap": { position: "relative", margin: "0.5em 0" },
  ".cm-rm-table": { borderCollapse: "collapse", fontSize: "0.95em" },
  ".cm-rm-table th, .cm-rm-table td": {
    border: "1px solid var(--vscode-widget-border, #555)",
    padding: "0.35em 0.7em",
    minWidth: "2.5em",
    outline: "none",
  },
  ".cm-rm-table th": {
    fontWeight: "700",
    background: "var(--vscode-textCodeBlock-background, rgba(128,128,128,.1))",
  },
  ".cm-rm-table th:focus, .cm-rm-table td:focus": {
    boxShadow: "inset 0 0 0 2px var(--vscode-focusBorder, #528bff)",
  },
  ".cm-rm-table-toolbar": {
    position: "absolute",
    top: "-1.7em",
    right: "0",
    display: "none",
    gap: "3px",
    zIndex: "10",
  },
  ".cm-rm-table-wrap:hover .cm-rm-table-toolbar, .cm-rm-table-wrap:focus-within .cm-rm-table-toolbar": {
    display: "flex",
  },
  ".cm-rm-table-toolbar button": {
    font: "inherit",
    fontSize: "0.72em",
    background: "var(--vscode-button-secondaryBackground, #3a3d41)",
    color: "var(--vscode-button-secondaryForeground, #eee)",
    border: "1px solid var(--vscode-widget-border, #555)",
    borderRadius: "3px",
    padding: "0.1em 0.5em",
    cursor: "pointer",
  },
});
