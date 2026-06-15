// The exported document's stylesheet: the editor's typography, print-friendly.
// Plain CSS (no VS Code variables — exports live outside the editor).
export const EXPORT_CSS = `
:root { color-scheme: light dark; }
body.rm-export {
  margin: 0;
  font: 15px/1.75 "Avenir Next", "Helvetica Neue", "Segoe UI", system-ui, sans-serif;
  color: #24292f;
  background: #ffffff;
}
@media (prefers-color-scheme: dark) {
  body.rm-export { color: #d4d9e1; background: #1e2227; }
  body.rm-export a { color: #7aa3d4; }
  body.rm-export th { background: rgba(128,128,128,0.12); }
  body.rm-export pre, body.rm-export code { background: rgba(128,128,128,0.14); }
  body.rm-export blockquote { border-left-color: #555; }
}
main { max-width: 46em; margin: 0 auto; padding: 2.5em 2em 4em; }
h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.3; }
h1 { font-size: 1.9em; margin: 0.6em 0 0.3em; }
h2 { font-size: 1.5em; margin: 0.6em 0 0.25em; }
h3 { font-size: 1.25em; }
a { color: #4d7cc1; text-decoration: none; }
code { font-family: Menlo, Consolas, monospace; font-size: 0.88em; background: rgba(128,128,128,0.15); border-radius: 3px; padding: 0.1em 0.3em; }
pre { background: rgba(128,128,128,0.12); border-radius: 4px; padding: 0.8em 1em; overflow-x: auto; line-height: 1.6; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #888; margin: 0.6em 0; padding: 0 0 0 1em; opacity: 0.85; font-style: italic; }
hr { border: none; border-top: 2px solid #ccc; margin: 1.2em 0; }
table { border-collapse: collapse; font-size: 0.95em; margin: 0.8em 0; }
th, td { border: 1px solid #b9c0c8; padding: 0.35em 0.7em; }
th { font-weight: 700; background: rgba(128,128,128,0.08); }
ul.contains-task-list, li.task-list-item { list-style: none; }
li.task-list-item { margin-left: -1.2em; }
img { max-width: 100%; border-radius: 3px; }
.rm-math-block { text-align: center; padding: 0.4em 0; }
.rm-mermaid { text-align: center; padding: 0.5em 0; }
.rm-mermaid svg { max-width: 100%; }
@page { margin: 18mm; }
@media print {
  body.rm-export { color: #000; background: #fff; }
  main { max-width: none; padding: 0; }
  pre, blockquote, table, .rm-mermaid, .rm-math-block, img { break-inside: avoid; }
  a { text-decoration: underline; }
}
`;
