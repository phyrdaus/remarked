// The slot contract between renderMarkdown (emits) and fillMermaidSlots
// (consumes). One definition so the markup and the regex cannot drift.
export function mermaidSlot(index: number): string {
  return `<div class="rm-mermaid-slot" data-mermaid="${index}"></div>`;
}

export const MERMAID_SLOT_RE = /<div class="rm-mermaid-slot" data-mermaid="(\d+)"><\/div>/g;
