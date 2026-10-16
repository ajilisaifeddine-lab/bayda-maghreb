import { parse } from "./parser.js";

export function getTargets(code: string) {
  return parse(code);
}
