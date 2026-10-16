import type { Call, If, Program, Stmt } from "../core/program.js";
import { LOG, arg, renderTokens } from "./common.js";
export function toPython(node:any):string{ if(node.type==="Program") return node.body.map(toPython).join("\n"); if(node.type==="Print") return `print("${node.value}")`; return ""; }

const PY = new Map([["true", "True"], ["false", "False"], ["null", "None"]]);
const pyCall = (n: Call) => `${LOG.has(n.name) ? "print" : n.name}(${n.args.map(arg).join(", ")})`;

function pyBlock(list: Stmt[], ind: string): string {
  return list.length ? list.map((s) => pyStmt(s, ind)).join("\n") : `${ind}pass`;
}

function pyIf(n: If, ind: string, lead: string): string {
  const test = renderTokens(n.test.tokens, (t) => (t.type === "KEYWORD" ? PY.get(t.value) ?? t.value : t.value));
  let out = `${ind}${lead} ${test}:\n${pyBlock(n.then, ind + "    ")}`;
  if (n.else) {
    const only = n.else[0];
    out += n.else.length === 1 && only.type === "If" ? `\n${pyIf(only, ind, "elif")}` : `\n${ind}else:\n${pyBlock(n.else, ind + "    ")}`;
  }
  return out;
}

function pyStmt(s: Stmt, ind: string): string {
  return s.type === "If" ? pyIf(s, ind, "if") : ind + pyCall(s);
}

export function writePython(p: Program): string {
  return p.body.map((s) => pyStmt(s, "")).join("\n");
}
