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

describe("transpile safety", () => {
  it("keeps let in separate functions", () => {
    const out = transpile("function a(){\n  let x = 1\n}\nfunction b(){\n  let x = 2\n}", "tn-latn")
    expect(out).toContain("let x = 2")
  })
  it("drops a repeated let in the same scope", () => {
    const out = transpile("let x = 1\nlet x = 2", "tn-latn")
    expect(out).not.toMatch(/let x = 2/)
  })
  it("leaves template strings alone", () => {
    expect(transpile("console.log(`khalli idha`)", "tn-latn")).toBe("console.log(`khalli idha`)")
  })
})
