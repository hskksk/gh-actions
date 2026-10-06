import { DEFAULT_MODEL, MODEL_ALIASES } from "./constants.js";

/** Bare model id lookup: opencode-go wins over opencode when both define the same id. */
const BARE_MODEL_PROVIDER_PRIORITY = ["opencode-go", "opencode"] as const;

export type ModelCatalog = {
  /** Resolve model id: alias, bare id (opencode-go then opencode), or provider/model. */
  resolve(token: string): string | null;
  resolvePositional(token: string): string | null;
};

export function buildModelCatalog(
  providers: Record<string, { models?: Record<string, unknown> }>,
): ModelCatalog {
  const modelIdsByProvider = new Map<string, Set<string>>();
  const canonicalByProviderModel = new Map<string, string>();

  for (const providerId of BARE_MODEL_PROVIDER_PRIORITY) {
    const models = providers[providerId]?.models;
    if (!models) continue;
    const ids = new Set(Object.keys(models));
    modelIdsByProvider.set(providerId, ids);
    for (const modelId of ids) {
      canonicalByProviderModel.set(`${providerId}/${modelId}`.toLowerCase(), `${providerId}/${modelId}`);
    }
  }

  const resolveBareModelId = (modelId: string): string | null => {
    for (const providerId of BARE_MODEL_PROVIDER_PRIORITY) {
      const ids = modelIdsByProvider.get(providerId);
      if (ids?.has(modelId)) {
        return `${providerId}/${modelId}`;
      }
    }
    return null;
  };

  return {
    resolve(token: string): string | null {
      const trimmed = token.trim().replace(/^["']|["']$/g, "");
      if (!trimmed) return null;

      const alias = MODEL_ALIASES[trimmed.toLowerCase()];
      if (alias) return alias;

      if (trimmed.includes("/")) {
        const key = trimmed.toLowerCase();
        return canonicalByProviderModel.get(key) ?? null;
      }

      return resolveBareModelId(trimmed);
    },

    resolvePositional(token: string): string | null {
      return this.resolve(token);
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
