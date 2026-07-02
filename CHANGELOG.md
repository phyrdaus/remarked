# Changelog

## 0.3.0 - 2026-07-01

- **Preview panel.** Open a live, read-only **Preview to the Side** (toolbar
  button, `editor/title` icon, or the `Remarked.md: Open Preview to the Side`
  command). It renders the whole document with Remarked's own pipeline — math,
  Mermaid, images, and custom CSS all match the editor — and updates as you
  type. Because it's a rendered view, selecting and copying yields formatted
  rich text (paste into a document or email with bold, links, etc. intact),
  unaffected by the inline source markers.
- **Export buttons.** **Export to HTML** and **Export to PDF** are now on the
  formatting toolbar, alongside the existing commands.
- **Fix:** toolbar and table tooltips now show platform-correct shortcut keys —
  `Ctrl`/`Alt` on Windows and Linux, `⌘`/`⌥` on macOS — instead of always
  showing the macOS symbols.
- **Fix:** formatting shortcuts no longer trigger workbench actions. Pressing
  `Ctrl`/`⌘`+`B` (and `I`, `` ` ``, `K`) inside the editor now only applies the
  formatting — previously it also toggled the Side Bar and similar global
  shortcuts that share those keys.
- **Fix:** clicking in the rich-text view now places the cursor on the line you
  clicked. Heading spacing used CSS margins, which CodeMirror's line measurement
  ignores, so clicks below headings landed a few rows too low — drifting further
  the more headings sat above the click.

## 0.2.3 - 2026-06-28

- **Smaller package.** Ship woff2-only KaTeX fonts and exclude repo-only
  files from the VSIX, roughly halving the published package size. No
  change to rendering or features.

## 0.2.2 - 2026-06-28

- **Docs:** add a Ko-fi support badge to the README.

## 0.2.1 - 2026-06-17

- **Fix:** the toolbar **View Source** button now remembers the source view as
  the default (when `remarked.rememberLastFormat` is on), matching the `⌥⌘E`
  shortcut. Previously only the keyboard shortcut / command persisted the choice.

## 0.2.0 - 2026-06-16

- **Remember last-used view.** Switching a Markdown file between the rich-text
  and source views now sets that view as the default for newly opened Markdown
  files. Turn it off with `remarked.rememberLastFormat: false`.

## 0.1.1 - 2026-06-16

- **View Source** button in the formatting toolbar, opening the raw Markdown in
  the text editor (same as `⌥⌘E`).

## 0.1.0 - 2026-06-11

First marketplace release.

- Live WYSIWYG markdown editing: the document is the editor; syntax
  reveals span-by-span around your caret and re-renders as you leave.
- Byte-perfect files: the source text is the document model; nothing is ever
  reformatted behind your back.
- Instant source toggle (`⌥⌘E` / `Ctrl+Shift+Alt+E`).
- Formatting toolbar at the top of the editor (bold, italic, strikethrough,
  inline code, headings, lists, blockquote, code block, horizontal rule, link,
  image, table) with buttons that reflect the formatting at the cursor; hide it
  with `remarked.toolbar.enabled: false`.
- GFM: tables with in-place cell editing (Tab/Enter navigation, hover toolbar
  for rows/columns/alignment, `⌘/` source flip), task lists, strikethrough.
- KaTeX math (inline `$…$` and block `$$…$$`) and Mermaid diagrams.
- Images: inline rendering, paste & drag-drop with a configurable save folder.
- Jump to heading (`⇧⌘O`), word count + reading time in the status bar.
- Focus mode and typewriter mode.
- Custom CSS (`remarked.customCss`), adaptive light/dark theming.
- Export to self-contained HTML and to PDF (via your installed Chrome/Edge).
- Large-file gate with "render anyway" prompt; math/mermaid feature flags.
