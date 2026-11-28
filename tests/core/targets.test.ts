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

  it("should transpile to C", () => {
    const c = toTarget('goul("salam")', "", "c");
    expect(c).toContain("printf");
  });

  it("should transpile to C++", () => {
    const cpp = toTarget('goul("salam")', "", "cpp");
    expect(cpp).toContain("std::cout");
  });

  it("should transpile to Java", () => {
    const java = toTarget('goul("salam")', "", "java");
    expect(java).toContain("System.out.println");
  });

  it("should transpile to PHP", () => {
    const php = toTarget('goul("salam")', "", "php");
    expect(php).toContain("echo");
  });

  it("should transpile to Arabic Algo (Pseudo-code)", () => {
    const algo = toTarget('goul("salam")', "", "algo");
    expect(algo).toContain("اطبع");
  });
});
