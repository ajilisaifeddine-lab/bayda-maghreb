import { describe, it, expect } from "vitest";
import { lex } from "../../core/lexer.js";
import { normalize } from "../../core/normalizer.js";

const kw = { idha: "if", ken: "if", "idha ken": "else if", goul: "log" };
const run = (src: string) =>
  normalize(lex(src, new Set()), kw).filter((t) => t.type !== "EOF").map((t) => t.type + ":" + t.value);

describe("normalizer", () => {
  it("turns a dialect word into its concept", () => {
    expect(run("idha")).toEqual(["KEYWORD:if"]);
  });
  it("reads a two-word phrase before single words", () => {
    expect(run("idha ken")).toEqual(["KEYWORD:else if"]);
  });
  it("keeps unknown words and strings", () => {
    expect(run('x "idha"')).toEqual(["IDENT:x", "STRING:idha"]);
  });
});
