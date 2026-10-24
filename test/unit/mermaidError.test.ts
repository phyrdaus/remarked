import { describe, it, expect } from "vitest";
import { formatMermaidError } from "../../src/webview/render/mermaidError";

// Messages captured verbatim from mermaid 12.2.0.
const DANGLING_ARROW = [
  "Parse error on line 3:",
  "...lowchart LR  A -->",
  "---------------------^",
  "Expecting 'AMP', 'COLON', 'PIPE', 'TESTSTR', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'EOF'",
].join("\n");

const SEQUENCE_TYPO = [
  "Parse error on line 2:",
  "...  Alice-->>Bob Hello",
  "-----------------------^",
  "Expecting 'TXT', got 'NEWLINE'",
].join("\n");

const UNCLOSED_CLASS = [
  "Parse error on line 3:",
  "...ram  class A {  ¬",
  "--------------------^",
  "Expecting 'STRUCT_STOP', 'MEMBER', got 'EOF_IN_STRUCT'",
].join("\n");

const BAD_BRACKET = [
  "Parse error on line 3:",
  "...t LR  A[open --> B",
  "---------------------^",
  "Expecting 'SQE', 'DOUBLECIRCLEEND', 'PE', '-)', 'STADIUMEND', 'SUBROUTINEEND', 'PIPE', 'CYLINDEREND', 'DIAMOND_STOP', 'TAGEND', 'TRAPEND', 'INVTRAPEND', 'UNICODE_TEXT', 'TEXT', 'TAGSTART', got '1'",
].join("\n");

const LEXICAL = [
  "Lexical error on line 3. Unrecognized text.",
  "...rt LR  A --> B  B ~~> C ¬",
  "---------------------^",
].join("\n");

const PIE_LANGIUM =
  "Parsing failed: Lexer error on line 2, column 12: unexpected character: ->l<- at offset: 15, skipped 4 characters. Parse error on line 2, column 16: Expecting token of type 'NUMBER_PIE' but found `\n`.";

const UNKNOWN_TYPE = "No diagram type detected matching given configuration for text: flowchat LR\n  A --> B";

describe("formatMermaidError", () => {
  it("parse error: header plus a plain-English reason, snippet and caret kept, token list dropped", () => {
    expect(formatMermaidError(DANGLING_ARROW)).toEqual({
      summary: "Parse error on line 3, unexpected end of diagram",
      snippet: "...lowchart LR  A -->\n---------------------^",
      full: DANGLING_ARROW,
    });
  });

  it("maps line-break tokens", () => {
    expect(formatMermaidError(SEQUENCE_TYPO).summary).toBe("Parse error on line 2, unexpected line break");
  });

  it("maps an unclosed { block", () => {
    expect(formatMermaidError(UNCLOSED_CLASS).summary).toBe("Parse error on line 3, a { block is never closed");
  });

  it("omits the reason when the token is a grammar name users wouldn't recognise", () => {
    const f = formatMermaidError(BAD_BRACKET);
    expect(f.summary).toBe("Parse error on line 3");
    expect(f.snippet).toBe("...t LR  A[open --> B\n---------------------^");
  });

  it("lexical error: keeps its own header and the snippet", () => {
    expect(formatMermaidError(LEXICAL)).toEqual({
      summary: "Lexical error on line 3. Unrecognized text.",
      snippet: "...rt LR  A --> B  B ~~> C ¬\n---------------------^",
      full: LEXICAL,
    });
  });

  it("long one-line errors are cut to 160 characters, full text kept", () => {
    const f = formatMermaidError(PIE_LANGIUM);
    expect(f.summary).toHaveLength(160);
    expect(f.summary.endsWith("…")).toBe(true);
    expect(PIE_LANGIUM.startsWith(f.summary.slice(0, -1))).toBe(true);
    expect(f.snippet).toBeUndefined();
    expect(f.full).toBe(PIE_LANGIUM);
  });

  it("anything else falls back to the first line, as before", () => {
    expect(formatMermaidError(UNKNOWN_TYPE)).toEqual({
      summary: "No diagram type detected matching given configuration for text: flowchat LR",
      full: UNKNOWN_TYPE,
    });
    expect(formatMermaidError("childNodeEl.node(...)?.getBBox is not a function").summary).toBe(
      "childNodeEl.node(...)?.getBBox is not a function"
    );
  });
});
