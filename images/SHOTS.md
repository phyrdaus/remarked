# README screenshots — shot list

Capture these four PNGs from the **running extension** (open `demo/demo.md` in
Remarked) and save them at the exact paths below. The README already references
them, so they render as soon as the files exist.

> **v0.1.1 update (FIR-21):** the toolbar now ends with a **View Source**
> button (markdown icon, far right — opens the raw `.md`). Re-capture the
> toolbar shots (**01** and **04**, and **02/03** if the top toolbar is in
> frame) with **v0.1.1+ installed** so that button is visible. Install/update
> first: search "Remarked.md" in the Extensions panel → Update, or
> `code --install-extension phyr.remarked`.

Tips for clean shots:
- Use a comfortable window width (~900–1100px of editor) so text isn't cramped.
- A dark VS Code theme matches the screenshots' framing, but either is fine —
  the editor adapts to your theme.
- Crop to the editor pane (hide the VS Code sidebar/panel if it's distracting:
  `⌘B` toggles the sidebar).
- Export at 2× / Retina if you can; the Marketplace/extension page downscales
  nicely.

| File | What to capture |
| --- | --- |
| `images/01-live-editor.png` | The hero shot: `demo.md` open in Remarked showing the **formatting toolbar at the top** (now including the trailing **View Source** button) plus rendered headings/paragraphs/inline formatting. This is the first impression — make it look like a clean live document. |
| `images/02-table-editing.png` | A **GFM table** from `demo.md` being edited in place — ideally with a cell focused and the hover toolbar (add row/column, alignment) visible. |
| `images/03-math-mermaid.png` | A view showing **KaTeX math** and a **Mermaid diagram** rendered inline (the demo has both — scroll to a spot where you can frame them together, or crop one if needed). |
| `images/04-toolbar-active.png` | A close-up of the **full toolbar with one or more buttons lit** (active-state) — e.g. put the caret inside bold text and inside a heading so Bold / H-level buttons highlight. Make sure the **View Source** button (far right) is in frame. |

Optional extras you could add later (and reference in the README): image
paste/drag-drop, the source toggle (`⌥⌘E`), or an HTML/PDF export result.
