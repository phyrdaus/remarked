import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { mathExtension } from "../../src/webview/render/mathExtension";

function tree(doc: string): string {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, extensions: [mathExtension] })],
  });
  ensureSyntaxTree(state, doc.length, 5000);
  return syntaxTree(state).toString();
}

describe("mathExtension parsing", () => {
  it("parses inline $...$ into InlineMath with MathMark delimiters", () => {
    expect(tree("a $x^2$ b")).toContain("InlineMath(MathMark,MathMark)");
  });

  it("does not treat a lone $ or $$ as inline math", () => {
    expect(tree("costs $5 and $6")).not.toContain("InlineMath");
    expect(tree("a $$ b")).not.toContain("InlineMath");
  });

  it("parses a $$ block into BlockMath", () => {
    expect(tree("$$\nE = mc^2\n$$")).toContain("BlockMath");
  });

  it("parses single-line $$...$$ into BlockMath", () => {
    expect(tree("$$E = mc^2$$")).toContain("BlockMath");
  });

  it("does not treat $$x$$ with trailing text as a block (and never swallows following lines)", () => {
    const t = tree("$$x$$ tail\nline2\nline3");
    expect(t).not.toContain("BlockMath");
  });

  it("does not match across prose where the closing $ follows whitespace", () => {
    expect(tree("between $foo and $bar today")).not.toContain("InlineMath");
  });
});
