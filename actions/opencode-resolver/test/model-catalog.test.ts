import { describe, expect, it } from "vitest";
import { buildModelCatalog, createTestModelCatalog } from "../src/model-catalog.js";

describe("buildModelCatalog", () => {
  const catalog = createTestModelCatalog([
    "opencode/big-pickle",
    "opencode/kimi-k2.5",
    "opencode-go/kimi-k3",
    "opencode-go/glm-5.3-flash",
  ]);

  it("resolves full provider/model ids", () => {
    expect(catalog.resolve("opencode/kimi-k2.5")).toBe("opencode/kimi-k2.5");
  });

  it("resolves bare model ids when unambiguous", () => {
    expect(catalog.resolve("kimi-k3")).toBe("opencode-go/kimi-k3");
  });

  it("resolves aliases", () => {
    expect(catalog.resolve("big-pickle")).toBe("opencode/big-pickle");
  });

  it("returns null for unknown tokens", () => {
    expect(catalog.resolve("fix")).toBeNull();
    expect(catalog.resolve("implement")).toBeNull();
  });

  it("prefers opencode-go over opencode for duplicate bare model ids", () => {
    const dup = buildModelCatalog({
      opencode: { models: { shared: {} } },
      "opencode-go": { models: { shared: {} } },
    });
    expect(dup.resolvePositional("shared")).toBe("opencode-go/shared");
  });

  it("resolves bare kimi-k2.5 to opencode when only that provider lists it", () => {
    const catalog = createTestModelCatalog(["opencode/kimi-k2.5"]);
    expect(catalog.resolvePositional("kimi-k2.5")).toBe("opencode/kimi-k2.5");
  });

  it("resolves provider/model for positional tokens", () => {
    const catalog = createTestModelCatalog(["opencode/kimi-k2.5"]);
    expect(catalog.resolvePositional("opencode/kimi-k2.5")).toBe("opencode/kimi-k2.5");
  });

  it("resolveLatestByGlob picks newest deepseek-v*-flash on opencode-go", () => {
    const catalog = createTestModelCatalog([
      "opencode-go/deepseek-v4-flash",
      "opencode-go/deepseek-v4.1-flash",
      "opencode-go/deepseek-v4-pro",
    ]);
    expect(catalog.resolveLatestByGlob("opencode-go", "deepseek-v*-flash")).toBe(
      "opencode-go/deepseek-v4.1-flash",
    );
  });

  it("resolveLatestByGlob picks newest gpt-*-luna when catalog changes", () => {
    const v1 = createTestModelCatalog(["opencode-go/gpt-5.6-luna"]);
    expect(v1.resolveLatestByGlob("opencode-go", "gpt-*-luna")).toBe("opencode-go/gpt-5.6-luna");

    const v2 = createTestModelCatalog(["opencode-go/gpt-5.6-luna", "opencode-go/gpt-6-luna"]);
    expect(v2.resolveLatestByGlob("opencode-go", "gpt-*-luna")).toBe("opencode-go/gpt-6-luna");
  });
});
