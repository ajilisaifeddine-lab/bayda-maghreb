import type { Call, If, Program, Stmt } from "../core/program.js";
import { LOG, arg, jsWord, renderTokens } from "./common.js";

const call = (n: Call) => `${LOG.has(n.name) ? "console.log" : n.name}(${n.args.map((a) => arg(a, jsWord)).join(", ")})`;

function block(list: Stmt[], ind: string): string {
  const body = list.map((s) => stmt(s, ind + "  ")).join("\n");
  return `{\n${body}${body ? "\n" : ""}${ind}}`;
}

function ifStmt(n: If, ind: string): string {
  const test = renderTokens(n.test.tokens, (t) => t.value);
  let out = `if (${test}) ${block(n.then, ind)}`;
  if (n.else) {
    const only = n.else[0];
    out += n.else.length === 1 && only.type === "If" ? ` else ${ifStmt(only, ind)}` : ` else ${block(n.else, ind)}`;
  }
  return out;
}

function stmt(s: Stmt, ind: string): string {
  return ind + (s.type === "If" ? ifStmt(s, ind) : call(s));
}

export function toJs(p: Program): string {
  return p.body.map((s) => stmt(s, "")).join("\n");
}
