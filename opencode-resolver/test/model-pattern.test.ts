import { describe, expect, it } from "vitest";
import { compareVersionSegments, pickLatestMatchingModelId } from "../src/model-pattern.js";

describe("pickLatestMatchingModelId", () => {
  it("picks the highest deepseek-v*-flash version", () => {
    const ids = ["deepseek-v4-flash", "deepseek-v4.1-flash", "deepseek-v4-pro"];
    expect(pickLatestMatchingModelId(ids, "deepseek-v*-flash")).toBe("deepseek-v4.1-flash");
  });

  it("picks the highest gpt-*-luna version", () => {
    const ids = ["gpt-5.6-luna", "gpt-6-luna", "gpt-5-luna"];
    expect(pickLatestMatchingModelId(ids, "gpt-*-luna")).toBe("gpt-6-luna");
  });

  it("updates when catalog gains a newer id", () => {
    const older = ["deepseek-v4-flash", "gpt-5.6-luna"];
    const newer = [...older, "deepseek-v4.2-flash", "gpt-6.1-luna"];
    expect(pickLatestMatchingModelId(older, "deepseek-v*-flash")).toBe("deepseek-v4-flash");
    expect(pickLatestMatchingModelId(newer, "deepseek-v*-flash")).toBe("deepseek-v4.2-flash");
    expect(pickLatestMatchingModelId(newer, "gpt-*-luna")).toBe("gpt-6.1-luna");
  });
});

describe("compareVersionSegments", () => {
  it("orders dotted versions numerically", () => {
    expect(compareVersionSegments("4.1", "4")).toBeGreaterThan(0);
    expect(compareVersionSegments("6", "5.6")).toBeGreaterThan(0);
  });
});
