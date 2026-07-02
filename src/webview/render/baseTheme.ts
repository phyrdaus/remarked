import { EditorView } from "@codemirror/view";

/**
 * Document-like typography. Colors intentionally lean on the VS Code theme
 * variables already inherited by the webview body; the full adaptive palette
 * derivation is Plan 4.
 */
/**
 * Raw style spec (exported for the FIR-83 regression test). Line-decoration
 * classes must never carry vertical `margin`: CodeMirror's height map measures
 * the line box, which excludes margins, so a margin desyncs click mapping from
 * the rendered layout. Use `padding` for line spacing instead.
 */
export const baseThemeSpec: Record<string, Record<string, string>> = {
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
  // Vertical spacing MUST be padding, not margin: these are line decorations
  // (class on .cm-line), and CodeMirror's height map measures the line box —
  // which excludes (and collapses) margins. Margins here desync the height map
  // from the rendered layout, so clicks below a heading resolve too far down,
  // accumulating with each heading above (FIR-83). Headings have no background,
  // so padding looks identical.
  ".cm-rm-h1": { fontSize: "1.9em", padding: "0.6em 0 0.3em" },
  ".cm-rm-h2": { fontSize: "1.5em", padding: "0.6em 0 0.25em" },
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
  ".cm-rm-table-toolbar .rm-tip": {
    position: "absolute",
    zIndex: "20",
    display: "none",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    fontSize: "0.72em",
    padding: "0.1em 0.5em",
    borderRadius: "3px",
    background: "var(--vscode-editorHoverWidget-background, #252526)",
    color: "var(--vscode-editorHoverWidget-foreground, #cccccc)",
    border: "1px solid var(--vscode-editorHoverWidget-border, #454545)",
  },
  ".cm-rm-table-toolbar .rm-tip.show": { display: "block" },
  // Find/replace panel (FIR-84), styled to match the formatting toolbar:
  // editor-background chrome with a panel-border divider, and transparent
  // buttons with the toolbar's rounded hover.
  ".cm-panels": {
    background: "var(--vscode-editor-background, #1e1e1e)",
    color: "var(--vscode-foreground, #cccccc)",
    borderBottom: "1px solid var(--vscode-panel-border, #3a3a3a)",
  },
  ".cm-panel.cm-search": { padding: "7px 8px", fontFamily: "system-ui, sans-serif" },
  ".cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label": {
    fontSize: "13px",
  },
  // Vertically center each checkbox with its label text.
  ".cm-panel.cm-search label": {
    color: "var(--vscode-foreground, #cccccc)",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  ".cm-panel.cm-search input[type=checkbox]": {
    width: "15px",
    height: "15px",
    margin: "0",
  },
  ".cm-panel.cm-search input[name=search], .cm-panel.cm-search input[name=replace]": {
    background: "var(--vscode-input-background, #3c3c3c)",
    color: "var(--vscode-input-foreground, #cccccc)",
    border: "1px solid var(--vscode-input-border, #3c3c3c)",
    borderRadius: "5px",
    padding: "5px 8px",
  },
  ".cm-panel.cm-search .cm-button": {
    background: "transparent",
    backgroundImage: "none",
    color: "var(--vscode-foreground, #cccccc)",
    border: "1px solid var(--vscode-input-border, #a3a3a3)",
    borderRadius: "5px",
    padding: "4px 12px",
    cursor: "pointer",
  },
  ".cm-panel.cm-search .cm-button:hover": {
    background: "var(--vscode-toolbar-hoverBackground, #ffffff14)",
  },
  // Live match-count readout injected next to the search field (FIR-85 follow-on).
  ".cm-search-count": {
    marginLeft: "8px",
    marginRight: "4px",
    fontSize: "12px",
    opacity: "0.75",
    verticalAlign: "middle",
    color: "var(--vscode-foreground, #cccccc)",
  },
  ".cm-searchMatch": {
    background: "var(--vscode-editor-findMatchHighlightBackground, rgba(234,92,0,.33))",
    borderRadius: "2px",
  },
  // The current match gets a crisp border (like VS Code's own Find) so it
  // stands out from the other matches — the two background vars alone are too
  // close in dark themes to tell apart.
  ".cm-searchMatch-selected": {
    background: "var(--vscode-editor-findMatchBackground, rgba(246,185,77,.55))",
    outline: "1px solid var(--vscode-editor-findMatchBorder, var(--vscode-focusBorder, #f5a623))",
    borderRadius: "2px",
  },
};

export const baseTheme = EditorView.theme(baseThemeSpec);
