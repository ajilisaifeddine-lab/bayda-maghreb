import { describe, it, expect } from "vitest";
import { loadDialect } from "../core/loader";
import { detectScript } from "../core/detector";
import { lex } from "../core/lexer";
import { normalize } from "../core/normalizer";
import { parseProgram } from "../core/program";
import { toTarget } from "../core/targets";

describe("End-to-End Integration", () => {
  
  it("should translate Tunisian Franco to JavaScript", () => {

    const tn = loadDialect("tn-latn", { consent: true });
    expect(tn).not.toBeNull();


    const sourceCode = 'ktab("salam")';
    const script = detectScript(sourceCode);
    expect(["franco", "latin"]).toContain(script);

    const tokens = lex(sourceCode);
    expect(tokens.length).toBeGreaterThan(0);


    const keywordsSet = new Set(Object.keys(tn?.keywords || {}));
    const normalizedTokens = normalize(tokens, keywordsSet);

    const ast = parseProgram(normalizedTokens);
    expect(ast.type).toBe("Program");
    expect(ast.body.length).toBe(1);


    const jsCode = toTarget(sourceCode, "test.bayda", "js");
    

    expect(jsCode).toContain("console.log"); 
  });
});
