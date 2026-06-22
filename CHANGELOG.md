# Changelog

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
