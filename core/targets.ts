import fs from "node:fs";
import { lex } from "./lexer.js";
import { normalize } from "./normalizer.js";
import { parseProgram } from "./program.js";
import { toJs } from "../writers/js-writer.js";
import { writePython } from "../writers/python-writer.js";

export function toTarget(code: string, file: string, target: "js" | "py"): string {
  const kw = JSON.parse(fs.readFileSync(file, "utf8")).keywords ?? {};
  const program = parseProgram(normalize(lex(code, new Set()), kw));
  return target === "js" ? toJs(program) : writePython(program);
}
