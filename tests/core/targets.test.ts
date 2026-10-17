import { describe, it, expect } from "vitest";
import { toTarget } from "../../core/targets";

describe("targets", () => {
  it("should transpile to JavaScript", () => {
    const js = toTarget('goul("salam")', "", "js");
    expect(js).toContain("console.log");
  });

  it("should transpile to Python", () => {
    const py = toTarget('goul("salam")', "", "py");
    expect(py).toContain("print");
  });
});
