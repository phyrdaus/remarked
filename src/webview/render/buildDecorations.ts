import { Decoration, type DecorationSet } from "@codemirror/view";
import type { EditorState, Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import { touchesSelection, lineRevealed, anyLineRevealed } from "./reveal";
import { getRenderSettings } from "./settings";
import { BulletWidget, HrWidget, CheckboxWidget, ImageWidget, MathWidget, MermaidWidget } from "./widgets";
import { handleTable } from "./table/widget";

// No atomicRanges facet, deliberately: line/node-granular reveal means any
// caret position inside a hidden range reveals it in the same update, so
// hidden markers are never invisibly traversed or deleted. Adding atomic
// ranges would make Backspace swallow whole markers — worse, not better.
const hide = Decoration.replace({});
const marker = Decoration.mark({ class: "cm-rm-marker" });

const inlineStyles: Record<string, Decoration> = {
  StrongEmphasis: Decoration.mark({ class: "cm-rm-strong" }),
  Emphasis: Decoration.mark({ class: "cm-rm-em" }),
  Strikethrough: Decoration.mark({ class: "cm-rm-strike" }),
  InlineCode: Decoration.mark({ class: "cm-rm-inline-code" }),
  Link: Decoration.mark({ class: "cm-rm-link" }),
};

const bulletDeco = Decoration.replace({ widget: new BulletWidget() });
const hrDeco = Decoration.replace({ widget: new HrWidget() });
const taskDoneLine = Decoration.line({ class: "cm-rm-task-done" });
const codeblockLine = Decoration.line({ class: "cm-rm-codeblock" });
const orderedMark = Decoration.mark({ class: "cm-rm-bullet" });
const quoteLine = Decoration.line({ class: "cm-rm-quote" });
const headingLines = [1, 2, 3, 4, 5, 6].map((n) =>
  Decoration.line({ class: `cm-rm-heading cm-rm-h${n}` })
);

/** Shared pass state every node handler appends decorations into. */
export interface HandlerCtx {
  state: EditorState;
  ranges: Range<Decoration>[];
}

/**
 * Decorates one node type. Returning false skips the node's children —
 * the same contract as tree.iterate's enter callback.
 */
export type NodeHandler = (ctx: HandlerCtx, ref: SyntaxNodeRef) => false | void;

/** Direct children whose node-type name ends in "Mark" (EmphasisMark, CodeMark, …). */
export function markChildren(node: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name.endsWith("Mark")) out.push(child);
  }
  return out;
}

/** Hide a block marker plus one trailing space when present ("# ", "> "). */
function hideMarkerWithSpace(ctx: HandlerCtx, from: number, to: number): void {
  const hideTo = ctx.state.doc.sliceString(to, to + 1) === " " ? to + 1 : to;
  ctx.ranges.push(hide.range(from, hideTo));
}

const headingHandler = (level: number): NodeHandler => (ctx, ref) => {
  const node = ref.node;
  const line = ctx.state.doc.lineAt(node.from);
  ctx.ranges.push(headingLines[level - 1].range(line.from));
  const mark = node.getChild("HeaderMark");
  if (!mark) return;
  if (lineRevealed(ctx.state, node.from)) {
    ctx.ranges.push(marker.range(mark.from, mark.to));
  } else {
    hideMarkerWithSpace(ctx, mark.from, mark.to);
  }
};

const handleBlockquote: NodeHandler = (ctx, ref) => {
  for (let pos = ref.from; pos <= ref.to; ) {
    const line = ctx.state.doc.lineAt(pos);
    ctx.ranges.push(quoteLine.range(line.from));
    pos = line.to + 1;
  }
  // children (quoted content) still get visited for inline styles
};

const handleQuoteMark: NodeHandler = (ctx, ref) => {
  if (lineRevealed(ctx.state, ref.from)) {
    ctx.ranges.push(marker.range(ref.from, ref.to));
  } else {
    hideMarkerWithSpace(ctx, ref.from, ref.to);
  }
};

const handleListMark: NodeHandler = (ctx, ref) => {
  const text = ctx.state.doc.sliceString(ref.from, ref.to);
  if (/^[-*+]$/.test(text)) {
    ctx.ranges.push(
      lineRevealed(ctx.state, ref.from)
        ? marker.range(ref.from, ref.to)
        : bulletDeco.range(ref.from, ref.to)
    );
  } else {
    ctx.ranges.push(orderedMark.range(ref.from, ref.to));
  }
};

const handleTaskMarker: NodeHandler = (ctx, ref) => {
  const checked = /x/i.test(ctx.state.doc.sliceString(ref.from, ref.to));
  if (checked) {
    const line = ctx.state.doc.lineAt(ref.from);
    ctx.ranges.push(taskDoneLine.range(line.from));
  }
  if (lineRevealed(ctx.state, ref.from)) {
    ctx.ranges.push(marker.range(ref.from, ref.to));
  } else {
    ctx.ranges.push(
      Decoration.replace({ widget: new CheckboxWidget(checked, ref.from, ref.to) }).range(
        ref.from,
        ref.to
      )
    );
  }
};

const handleHorizontalRule: NodeHandler = (ctx, ref) => {
  if (!lineRevealed(ctx.state, ref.from)) ctx.ranges.push(hrDeco.range(ref.from, ref.to));
};

const handleFencedCode: NodeHandler = (ctx, ref) => {
  const node = ref.node;
  const info = node.getChild("CodeInfo");
  const lang = info ? ctx.state.doc.sliceString(info.from, info.to).trim() : "";
  if (lang === "mermaid" && getRenderSettings().mermaid) {
    if (!anyLineRevealed(ctx.state, node.from, node.to)) {
      const text = node.getChild("CodeText");
      const source = text ? ctx.state.doc.sliceString(text.from, text.to) : "";
      ctx.ranges.push(
        Decoration.replace({ widget: new MermaidWidget(source), block: true }).range(
          node.from,
          node.to
        )
      );
      return false;
    }
    // revealed: fall through to normal fence rendering below
  }
  for (let pos = node.from; pos <= node.to; ) {
    const line = ctx.state.doc.lineAt(pos);
    ctx.ranges.push(codeblockLine.range(line.from));
    pos = line.to + 1;
  }
  // CodeMark/CodeInfo handled as separately-visited nodes; CodeText gets
  // language highlighting from CM itself
};

const handleFenceMark: NodeHandler = (ctx, ref) => {
  // Only fence marks: InlineCode's backtick CodeMarks are already handled
  // by the inline-style handler and must not be double-decorated here.
  if (ref.node.parent?.name !== "FencedCode") return;
  // Hide the whole "```lang" / "```" run: extend a CodeMark to the end of
  // its line when not revealed (covers CodeInfo in one range when present).
  if (lineRevealed(ctx.state, ref.from)) {
    ctx.ranges.push(marker.range(ref.from, ref.to));
  } else if (ref.name === "CodeMark") {
    const line = ctx.state.doc.lineAt(ref.from);
    ctx.ranges.push(hide.range(ref.from, line.to));
  }
};

const handleImage: NodeHandler = (ctx, ref) => {
  const node = ref.node;
  if (lineRevealed(ctx.state, node.from)) return; // raw source while editing
  const urlNode = node.getChild("URL");
  let src = urlNode ? ctx.state.doc.sliceString(urlNode.from, urlNode.to) : "";
  if (src.startsWith("<") && src.endsWith(">")) src = src.slice(1, -1);
  const marks = markChildren(node);
  const alt =
    marks.length >= 2 ? ctx.state.doc.sliceString(marks[0].to, marks[1].from) : "";
  ctx.ranges.push(
    Decoration.replace({ widget: new ImageWidget(src, alt) }).range(node.from, node.to)
  );
  return false; // fully replaced; nothing inside to decorate
};

const handleInlineMath: NodeHandler = (ctx, ref) => {
  const node = ref.node;
  if (touchesSelection(ctx.state.selection, node.from, node.to)) {
    for (const m of markChildren(node)) ctx.ranges.push(marker.range(m.from, m.to));
    return;
  }
  const tex = ctx.state.doc.sliceString(node.from + 1, node.to - 1);
  ctx.ranges.push(
    Decoration.replace({ widget: new MathWidget(tex, false) }).range(node.from, node.to)
  );
  return false;
};

const handleBlockMath: NodeHandler = (ctx, ref) => {
  const node = ref.node;
  if (anyLineRevealed(ctx.state, node.from, node.to)) return; // raw source while editing
  const tex = ctx.state.doc
    .sliceString(node.from, node.to)
    .replace(/^\$\$\s*/, "")
    .replace(/\s*\$\$\s*$/, "");
  ctx.ranges.push(
    Decoration.replace({ widget: new MathWidget(tex, true), block: true }).range(
      node.from,
      node.to
    )
  );
  return false;
};

const handleLink: NodeHandler = (ctx, ref) => {
  const node = ref.node;
  const marks = markChildren(node); // [ , ] , ( , )
  if (marks.length < 2) return;
  const textFrom = marks[0].to;
  const textTo = marks[1].from;
  const urlNode = node.getChild("URL");
  let href = urlNode ? ctx.state.doc.sliceString(urlNode.from, urlNode.to) : null;
  if (href && href.startsWith("<") && href.endsWith(">")) href = href.slice(1, -1);
  if (textFrom < textTo) {
    ctx.ranges.push(
      (href
        ? Decoration.mark({ class: "cm-rm-link", attributes: { title: href } })
        : inlineStyles.Link
      ).range(textFrom, textTo)
    );
  }
  if (touchesSelection(ctx.state.selection, node.from, node.to)) {
    for (const m of marks) ctx.ranges.push(marker.range(m.from, m.to));
  } else {
    ctx.ranges.push(hide.range(marks[0].from, marks[0].to)); // [
    ctx.ranges.push(hide.range(textTo, node.to)); // ](url)
  }
  return false; // don't double-decorate URL internals
};

const handleInlineStyle: NodeHandler = (ctx, ref) => {
  const style = inlineStyles[ref.name];
  if (!style) return;
  const node = ref.node;
  const marks = markChildren(node);
  if (marks.length < 2) return; // malformed/incomplete syntax: leave as source
  const contentFrom = marks[0].to;
  const contentTo = marks[marks.length - 1].from;
  if (contentFrom < contentTo) ctx.ranges.push(style.range(contentFrom, contentTo));
  const revealed = touchesSelection(ctx.state.selection, node.from, node.to);
  for (const m of marks) {
    ctx.ranges.push(revealed ? marker.range(m.from, m.to) : hide.range(m.from, m.to));
  }
};

const handlers: Record<string, NodeHandler> = {
  ATXHeading1: headingHandler(1),
  ATXHeading2: headingHandler(2),
  ATXHeading3: headingHandler(3),
  ATXHeading4: headingHandler(4),
  ATXHeading5: headingHandler(5),
  ATXHeading6: headingHandler(6),
  Blockquote: handleBlockquote,
  QuoteMark: handleQuoteMark,
  ListMark: handleListMark,
  TaskMarker: handleTaskMarker,
  HorizontalRule: handleHorizontalRule,
  FencedCode: handleFencedCode,
  CodeMark: handleFenceMark,
  CodeInfo: handleFenceMark,
  Image: handleImage,
  InlineMath: handleInlineMath,
  BlockMath: handleBlockMath,
  Link: handleLink,
  StrongEmphasis: handleInlineStyle,
  Emphasis: handleInlineStyle,
  Strikethrough: handleInlineStyle,
  InlineCode: handleInlineStyle,
  Table: handleTable,
  TableDelimiter: (ctx, ref) => {
    // Raw mode only (the widget skips children): dim pipes and the |---| line.
    ctx.ranges.push(marker.range(ref.from, ref.to));
  },
};

/**
 * Pure decoration pass over [from, to): styling marks always apply; syntax
 * markers are hidden unless the node overlaps the selection (syntax reveal).
 */
export function buildDecorations(state: EditorState, from = 0, to = state.doc.length): DecorationSet {
  const ctx: HandlerCtx = { state, ranges: [] };
  syntaxTree(state).iterate({
    from,
    to,
    enter: (ref) => handlers[ref.name]?.(ctx, ref),
  });
  return Decoration.set(ctx.ranges, true);
}
