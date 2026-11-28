// المحرك الوحيد لكل الكتّاب: يمرّ على الشجرة مرة واحدة ويستعين بصياغة الهدف (writers/syntax.ts) في مواضع الاختلاف.
import type { Arg, If, Program, Stmt } from "../core/ast.js";
import { BaydaError } from "../core/errors.js";
import { LOG, arg, renderTokens } from "./common.js";
import { callStatement, type Branch, type TargetSyntax } from "./syntax.js";

/** عقدة لا يعرفها المحرك: خطأ صريح بدل ناتج فارغ صامت. */
function unsupported(node: never): never {
  const type = String((node as { type?: unknown }).type);
  throw new BaydaError("UNSUPPORTED_NODE", `عقدة غير مدعومة: ${type}`, { type });
}

export function compileProgram(program: Program, syntax: TargetSyntax, keywords: Record<string, string>): string {
  const render = (a: Arg): string => arg(a, syntax.word);
  const block = (list: readonly Stmt[], level: number): string => list.map((s) => statement(s, level)).join("\n");

  const statement = (s: Stmt, level: number): string => {
    const indent = syntax.indent.repeat(level);
    switch (s.type) {
      case "Call": {
        // الاسم قد يكون كلمة لهجة (تُترجم عبر keywords) أو مفهوماً قياسياً بالفعل
        const concept = keywords[s.name] ?? s.name;
        if (!LOG.has(concept)) {
          return callStatement(indent, s.name, s.args.map(render), syntax.argSeparator, syntax.terminator);
        }
        const print = syntax.print;
        return "name" in print
          ? callStatement(indent, print.name, s.args.map(render), syntax.argSeparator, syntax.terminator)
          : print.custom(indent, s.args, render);
      }
      case "If": {
        // else if: فرع else يحوي عقدة If وحيدة
        const branches: Branch[] = [];
        let otherwise: string | null = null;
        let node: If = s;
        for (;;) {
          branches.push({ test: renderTokens(node.test.tokens, syntax.word), body: block(node.then, level + 1) });
          const rest = node.else;
          if (rest === null || rest.length === 0) break;
          const only = rest[0];
          if (rest.length === 1 && only.type === "If") {
            node = only;
            continue;
          }
          otherwise = block(rest, level + 1);
          break;
        }
        return syntax.ifChain(indent, branches, otherwise);
      }
      case "While":
        return syntax.whileLoop(indent, renderTokens(s.test.tokens, syntax.word), block(s.body, level + 1));
      case "Var": {
        const isStr = s.value.tokens.length === 1 && s.value.tokens[0].type === "STRING";
        return syntax.varStmt(indent, s.declare, s.name, renderTokens(s.value.tokens, syntax.word), isStr);
      }
      case "For": {
        const start = s.start ? renderTokens(s.start.tokens, syntax.word) : null;
        const end = s.end ? renderTokens(s.end.tokens, syntax.word) : null;
        const iterable = s.iterable ? renderTokens(s.iterable.tokens, syntax.word) : null;
        return syntax.forLoop(indent, s.variable, start, end, iterable, block(s.body, level + 1));
      }
      case "Fn":
        return syntax.fnDecl(indent, s.name, s.params, block(s.body, level + 1));
      case "Return":
        return syntax.returnStmt(indent, s.value ? renderTokens(s.value.tokens, syntax.word) : null);
      case "Try":
        return syntax.tryCatch(indent, block(s.body, level + 1), s.param, block(s.handler, level + 1));
      case "Flow":
        return syntax.flowStmt(indent, s.kind);
      default:
        return unsupported(s);
    }
  };

  if (program.type !== "Program") return unsupported(program as never);
  return block(program.body, 0);
}
