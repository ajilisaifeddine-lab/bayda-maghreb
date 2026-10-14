import { describe, it, expect } from "vitest"
import { dialects, getDialect, transpile } from "../index.js"

describe("transpile", () => {
  for (const d of dialects) {
    const kw = getDialect(d.code).keywords
    const w = c => Object.keys(kw).find(k => kw[k] === c)
    const ifw = w("if"), tw = w("true")
    if (!ifw || !tw) continue
    it(d.code + ": translates words but keeps strings", () => {
      const out = transpile(ifw + " (" + tw + ") { x = \"" + ifw + "\" }", d.code)
      expect(out).toBe("if (true) { x = \"" + ifw + "\" }")
    })
  }
})
