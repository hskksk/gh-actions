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

  it("prefers the first provider for duplicate bare ids", () => {
    const dup = buildModelCatalog({
      opencode: { models: { shared: {} } },
      "opencode-go": { models: { shared: {} } },
    });
    expect(dup.resolve("shared")).toBe("opencode/shared");
  });
});
