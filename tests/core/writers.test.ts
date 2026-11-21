// الكتّاب: مخرجات الأهداف السبعة ثابتة (fixtures من الكتّاب قبل المحرك المشترك)، وأي عقدة غير معروفة ترمي خطأً صريحاً.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { translate } from "../../core/translate";
import { toAlgo } from "../../writers/algo-writer";
import { toC } from "../../writers/c-writer";
import { toCpp } from "../../writers/cpp-writer";
import { toJava } from "../../writers/java-writer";
import { toJS } from "../../writers/js-writer";
import { toPHP } from "../../writers/php-writer";
import { toPython } from "../../writers/python-writer";

const here = typeof __dirname === "string" ? __dirname : path.dirname(new URL(import.meta.url).pathname);
const fixture = JSON.parse(fs.readFileSync(path.join(here, "../fixtures/writers.golden.json"), "utf8"));
const TARGETS = ["js", "py", "c", "cpp", "java", "php", "algo"] as const;

describe("الكتّاب — مخرجات ثابتة لكل الأهداف", () => {
  it.each(fixture.cases.map((c: any) => [c.src, c]))("%s", (_src: string, c: any) => {
    for (const target of TARGETS) {
      const run = () => translate(c.src, { keywords: fixture.keywords, target }).code;
      if (c.error) expect(run).toThrow(c.error);
      else expect(run(), target).toBe(c[target]);
    }
  });
});

const writers = [toJS, toPython, toC, toCpp, toJava, toPHP, toAlgo];
const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const token = { type: "IDENT", value: "x", line: 1, col: 1 };

describe("الكتّاب — عقدة غير معروفة", () => {
  it("بين الجمل: UNSUPPORTED_NODE بدل نص فارغ", () => {
    const program: any = { type: "Program", body: [{ type: "Foo" }] };
    for (const write of writers) expect(codeOf(() => write(program))).toBe("UNSUPPORTED_NODE");
  });

  it("داخل كتلة while أو if: UNSUPPORTED_NODE", () => {
    const test = { type: "Raw", tokens: [token] };
    const inWhile: any = { type: "Program", body: [{ type: "While", test, body: [{ type: "Foo" }] }] };
    const inIf: any = { type: "Program", body: [{ type: "If", test, then: [], else: [{ type: "Foo" }, { type: "Foo" }] }] };
    for (const write of writers) {
      expect(codeOf(() => write(inWhile))).toBe("UNSUPPORTED_NODE");
      expect(codeOf(() => write(inIf))).toBe("UNSUPPORTED_NODE");
    }
  });

  it("جذر ليس Program: UNSUPPORTED_NODE", () => {
    for (const write of writers) expect(codeOf(() => write({ type: "Foo" } as any))).toBe("UNSUPPORTED_NODE");
  });
});
