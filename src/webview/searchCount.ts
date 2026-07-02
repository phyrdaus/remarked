// Adds a live match-count readout ("3 of 12") to the find panel — CodeMirror's
// default search panel doesn't show one (FIR-85 follow-on). The counting is a
// pure function so it's unit-testable; a ViewPlugin injects the readout into the
// panel DOM and keeps it current.
import { ViewPlugin, type ViewUpdate, type EditorView } from "@codemirror/view";
import { getSearchQuery, type SearchQuery } from "@codemirror/search";
import type { Text } from "@codemirror/state";

/** Cap counting on pathologically large result sets; shown as "N+". */
const MAX = 1000;

/**
 * Total matches of `query` in `doc`, plus the 1-based index of the match at
 * exactly [from, to] (0 when the selection isn't sitting on a match). Pure.
 */
export function matchInfo(
  doc: Text,
  query: SearchQuery,
  from: number,
  to: number
): { count: number; current: number } {
  let count = 0;
  let current = 0;
  if (!query.search || !query.valid) return { count, current };
  try {
    const cursor = query.getCursor(doc);
    for (let r = cursor.next(); !r.done && count < MAX; r = cursor.next()) {
      count++;
      if (r.value.from === from && r.value.to === to) current = count;
    }
  } catch {
    // Defensive: a malformed query shouldn't break the editor — show nothing.
    return { count: 0, current: 0 };
  }
  return { count, current };
}

/** Human-readable label for the readout. */
export function countLabel(count: number, current: number): string {
  if (count === 0) return "No results";
  if (current > 0) return `${current} of ${count}`;
  return count >= MAX ? `${MAX}+ results` : `${count} results`;
}

/** Injects and maintains a `.cm-search-count` readout in the open search panel. */
export const searchCount = ViewPlugin.fromClass(
  class {
    private el: HTMLElement | null = null;
    constructor(private readonly view: EditorView) {
      this.render();
    }
    update(_u: ViewUpdate): void {
      this.render();
    }
    private render(): void {
      const panel = this.view.dom.querySelector<HTMLElement>(".cm-panel.cm-search");
      if (!panel) {
        this.el = null;
        return;
      }
      if (!this.el || !this.el.isConnected) {
        this.el = document.createElement("span");
        this.el.className = "cm-search-count";
        const input = panel.querySelector<HTMLElement>('input[name="search"]');
        if (input) input.after(this.el);
        else panel.appendChild(this.el);
      }
      const query = getSearchQuery(this.view.state);
      if (!query.search) {
        this.el.textContent = "";
        return;
      }
      const sel = this.view.state.selection.main;
      const { count, current } = matchInfo(this.view.state.doc, query, sel.from, sel.to);
      this.el.textContent = countLabel(count, current);
    }
  }
);
