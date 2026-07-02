# README screenshots: shot list

Capture these four PNGs from the **running extension** (open `demo/demo.md` in
Remarked) and save them at the exact paths below. The README already references
them, so they render as soon as the files exist.

> **v0.1.1 update (FIR-21):** the toolbar now ends with a **View Source**
> button (markdown icon, far right, opens the raw `.md`). The toolbar is a
> **fixed bar at the top of the editor**, so it appears in *all four* shots, so
> re-capture **every** screenshot with **v0.1.1+ installed** so the new button
> shows consistently (01 and 04 are toolbar-focused; 02 and 03 still show it on
> top). Install/update first: search "Remarked.md" in the Extensions panel →
> Update, or `code --install-extension phyr.remarked`.

> **v0.3.0 update:** the toolbar gained **Export to HTML**, **Export to PDF**,
> and **Open Preview to the Side** buttons at the far right. The toolbar is the
> fixed bar at the top of the editor, so it appears in **all four** shots — so
> re-capture **every** screenshot (**01–04**) with **v0.3.0+** installed so the
> current toolbar shows consistently. New shot **05** is required for the
> README's Preview section; **06** (find/replace) is optional.

Tips for clean shots:
- Use a comfortable window width (~900-1100px of editor) so text isn't cramped.
- A dark VS Code theme matches the screenshots' framing, but either is fine;
  the editor adapts to your theme.
- Crop to the editor pane (hide the VS Code sidebar/panel if it's distracting:
  `⌘B` toggles the sidebar).
- Export at 2× / Retina if you can; the Marketplace/extension page downscales
  nicely.

| File | What to capture |
| --- | --- |
| `images/01-live-editor.png` | The hero shot: `demo.md` open in Remarked showing the **formatting toolbar at the top** (now including the trailing **View Source** button) plus rendered headings/paragraphs/inline formatting. This is the first impression; make it look like a clean live document. |
| `images/02-table-editing.png` | A **GFM table** from `demo.md` being edited in place, ideally with a cell focused and the hover toolbar (add row/column, alignment) visible. |
| `images/03-math-mermaid.png` | A view showing **KaTeX math** and a **Mermaid diagram** rendered inline (the demo has both; scroll to a spot where you can frame them together, or crop one if needed). |
| `images/04-toolbar-active.png` | A close-up of the **full toolbar with one or more buttons lit** (active-state); e.g. put the caret inside bold text and inside a heading so Bold / H-level buttons highlight. Make sure the **View Source** button (far right) is in frame. |
| `images/05-preview-panel.png` | **Required for v0.3.1.** The editor (left) beside the **Preview to the Side** panel (right) rendering the same `demo.md`. Click *Open Preview to the Side* (toolbar or command), then put the caret partway down the doc so the preview is scrolled to the matching content (shows caret-follow sync). Frame both panes. |
| `images/06-find-replace.png` (optional) | The **find/replace panel** open over the editor (`⌘F` — the panel already shows the Replace row), with a term entered so matches highlight. Only add if you also add a matching image to the README. |

Optional extras you could add later (and reference in the README): image
paste/drag-drop, the source toggle (`⌥⌘E`), or an HTML/PDF export result.
