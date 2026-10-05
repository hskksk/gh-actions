import { ALLOWED_MODEL, DEFAULT_MODEL, MODEL_ALIASES } from "./constants.js";

const OPENCODE_PROVIDERS = ["opencode", "opencode-go"] as const;

export type ModelCatalog = {
  resolve(token: string): string | null;
};

export function buildModelCatalog(
  providers: Record<string, { models?: Record<string, unknown> }>,
): ModelCatalog {
  const byLookupKey = new Map<string, string>();

  for (const providerId of OPENCODE_PROVIDERS) {
    const models = providers[providerId]?.models;
    if (!models) continue;
    for (const modelId of Object.keys(models)) {
      const canonical = `${providerId}/${modelId}`;
      byLookupKey.set(canonical.toLowerCase(), canonical);
      const bareKey = modelId.toLowerCase();
      if (!byLookupKey.has(bareKey)) {
        byLookupKey.set(bareKey, canonical);
      }
    }
  }

  for (const [alias, target] of Object.entries(MODEL_ALIASES)) {
    byLookupKey.set(alias.toLowerCase(), target);
  }

  return {
    resolve(token: string): string | null {
      const trimmed = token.trim().replace(/^["']|["']$/g, "");
      if (!trimmed) return null;

      const direct = byLookupKey.get(trimmed.toLowerCase());
      if (direct) return direct;

      if (trimmed.includes("/")) {
        const [providerId, ...rest] = trimmed.split("/");
        const modelId = rest.join("/");
        if (!providerId || !modelId) return null;
        if (!OPENCODE_PROVIDERS.includes(providerId as (typeof OPENCODE_PROVIDERS)[number])) {
          return null;
        }
        const canonical = `${providerId}/${modelId}`;
        if (!ALLOWED_MODEL.test(canonical)) return null;
        return byLookupKey.get(canonical.toLowerCase()) ?? null;
      }

      return null;
    },
  };
}

export function createTestModelCatalog(refs: string[]): ModelCatalog {
  const providers: Record<string, { models: Record<string, unknown> }> = {
    opencode: { models: {} },
    "opencode-go": { models: {} },
  };
  for (const ref of refs) {
    const [providerId, modelId] = ref.split("/");
    if (!providerId || !modelId) continue;
    if (!providers[providerId]) providers[providerId] = { models: {} };
    providers[providerId].models[modelId] = {};
  }
  return buildModelCatalog(providers);
}

export async function fetchModelCatalog(): Promise<ModelCatalog> {
  const response = await fetch("https://models.dev/api.json", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to load model catalog (${response.status})`);
  }
  const data = (await response.json()) as Record<string, { models?: Record<string, unknown> }>;
  const catalog = buildModelCatalog(data);
  if (catalog.resolve("big-pickle") !== DEFAULT_MODEL) {
    throw new Error("Model catalog loaded but looks incomplete");
  }
  return catalog;
}
