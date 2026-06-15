// Host-only (export pipeline). Mirrors the editor's semantics where they
// matter: GFM tables/strikethrough, task lists, our $-math guards, mermaid
// fences. Raw HTML is escaped (html:false) — consistent with the editor, and
// it keeps exported files free of script-injection surface.
//
// NOTE: @types/markdown-it@14.1.2 does not expose deep subpath imports
// (markdown-it/lib/rules_*) via its package exports map. State types are
// extracted via the Parameters<> utility from the ruler's push() signature —
// fully typed, no `any` loosening.
import MarkdownIt from "markdown-it";
import katex from "katex";
import { mermaidSlot } from "./mermaidSlot";

// Extract state types from the MarkdownIt instance type via Parameters<>.
// This avoids the broken deep subpath imports (markdown-it/lib/rules_core/…)
// that @types/markdown-it@14 no longer exposes in the package exports map.
type MI = InstanceType<typeof MarkdownIt>;
type StateCore = Parameters<Parameters<MI["core"]["ruler"]["push"]>[1]>[0];
type StateInline = Parameters<Parameters<MI["inline"]["ruler"]["push"]>[1]>[0];
type StateBlock = Parameters<Parameters<MI["block"]["ruler"]["push"]>[1]>[0];

export interface RenderedMarkdown {
  html: string;
  /** First H1 text, or null. */
  title: string | null;
  /** Unique local image srcs in document order, exactly as rendered into the
   *  HTML attrs (percent-encoded); http/data excluded. */
  imageSrcs: string[];
  /** Mermaid fence bodies; html contains one rm-mermaid-slot per entry. */
  mermaidSources: string[];
}

/** Inline $…$ with the editor's guards: no space/digit/$ after the opening
 *  $, no space before the closing $, single line. */
function mathInline(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const pos = state.pos;
  if (src[pos] !== "$") return false;
  const after = src[pos + 1];
  if (!after || after === " " || after === "$" || /[0-9]/.test(after)) return false;
  let end = -1;
  for (let i = pos + 1; i < src.length; i++) {
    if (src[i] === "\n") break;
    if (src[i] === "$") {
      end = i;
      break;
    }
  }
  if (end < 0 || src[end - 1] === " ") return false;
  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.content = src.slice(pos + 1, end);
  }
  state.pos = end + 1;
  return true;
}

function lineText(state: StateBlock, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

/** $$ blocks: single-line $$x$$ or multi-line $$ … $$. */
function mathBlock(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const first = lineText(state, startLine).trim();
  if (!first.startsWith("$$")) return false;
  const content: string[] = [];
  let lastLine = startLine;
  if (first.length > 4 && first.endsWith("$$")) {
    content.push(first.slice(2, -2));
  } else {
    const tail = first.slice(2).trim();
    if (tail) content.push(tail);
    let closed = false;
    for (let line = startLine + 1; line < endLine; line++) {
      const text = lineText(state, line).trim();
      if (text.endsWith("$$")) {
        const body = text.slice(0, -2).trim();
        if (body) content.push(body);
        lastLine = line;
        closed = true;
        break;
      }
      content.push(text);
    }
    if (!closed) return false;
  }
  if (silent) return true;
  const token = state.push("math_block", "math", 0);
  token.content = content.join("\n").trim();
  token.map = [startLine, lastLine + 1];
  state.line = lastLine + 1;
  return true;
}

/** "[ ] " / "[x] " at the start of a list item's paragraph → checkbox. */
function taskLists(state: StateCore): void {
  const tokens = state.tokens;
  for (let i = 2; i < tokens.length; i++) {
    if (tokens[i].type !== "inline") continue;
    if (tokens[i - 1].type !== "paragraph_open" || tokens[i - 2].type !== "list_item_open") continue;
    const children = tokens[i].children ?? [];
    const first = children[0];
    if (!first || first.type !== "text") continue;
    const m = /^\[([ xX])\] /.exec(first.content);
    if (!m) continue;
    first.content = first.content.slice(4);
    const checkbox = new state.Token("html_inline", "", 0);
    checkbox.content = `<input type="checkbox" disabled${m[1] === " " ? "" : " checked"}> `;
    children.unshift(checkbox);
    tokens[i - 2].attrJoin("class", "task-list-item");
  }
}

function renderKatex(tex: string, displayMode: boolean): string {
  // throwOnError:false renders the error in red inside the output — visible,
  // never a crashed export (spec: degrade visibly).
  return katex.renderToString(tex, { displayMode, throwOnError: false });
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const md = new MarkdownIt({ html: false, linkify: false });
  md.inline.ruler.after("escape", "math_inline", mathInline);
  md.block.ruler.before("fence", "math_block", mathBlock, {
    alt: ["paragraph", "blockquote", "list"],
  });
  md.core.ruler.after("inline", "task_lists", taskLists);

  md.renderer.rules.math_inline = (tokens, idx) => renderKatex(tokens[idx].content, false);
  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="rm-math-block">${renderKatex(tokens[idx].content, true)}</div>\n`;

  const mermaidSources: string[] = [];
  const defaultFence = md.renderer.rules.fence!.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const lang = tokens[idx].info.trim().split(/\s+/)[0];
    if (lang === "mermaid") {
      const i = mermaidSources.push(tokens[idx].content) - 1;
      return mermaidSlot(i) + "\n";
    }
    return defaultFence(tokens, idx, options, env, self);
  };

  const imageSrcs = new Set<string>();
  const defaultImage = md.renderer.rules.image!.bind(md.renderer.rules);
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const src = tokens[idx].attrGet("src") ?? "";
    if (src && !/^(https?:|data:)/i.test(src)) {
      // Srcs must match the rendered attr — replaceImageSrcs keys on them;
      // file reads decode at lookup time.
      imageSrcs.add(src);
    }
    return defaultImage(tokens, idx, options, env, self);
  };

  const tokens = md.parse(source, {});
  let title: string | null = null;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === "heading_open" && tokens[i].tag === "h1") {
      title = tokens[i + 1].content.trim();
      break;
    }
  }
  const html = md.renderer.render(tokens, md.options, {});
  return { html, title, imageSrcs: [...imageSrcs], mermaidSources };
}
