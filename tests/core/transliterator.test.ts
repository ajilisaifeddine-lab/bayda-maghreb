import { describe, it, expect } from "vitest";
import { detectScript, transliterate } from "../../core/transliterator";

describe("transliterator", () => {
  it("should detect Franco script", () => {
    expect(detectScript("achou")).toBe("franco");
  });

  it("should detect Arabic script", () => {
    expect(detectScript("واشو")).toBe("arabic");
  });

  it("should transliterate Franco to Latin", () => {
    const result = transliterate("achou", "franco", "latin");
    expect(result).toBe("acu");
  });
});
