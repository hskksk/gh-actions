export const DEFAULT_MODEL = "opencode/big-pickle";

export const MODEL_ALIASES: Record<string, string> = {
  "big-pickle": DEFAULT_MODEL,
  pickle: DEFAULT_MODEL,
};

/** Build commands that pin the model via catalog glob (latest matching id). */
export const BUILD_CMD_MODEL_GLOBS: Record<string, { provider: string; glob: string }> = {
  "/oc-deep": { provider: "opencode-go", glob: "deepseek-v*-flash" },
  "/oc-gpt": { provider: "opencode-go", glob: "gpt-*-luna" },
};

export const ALLOWED_MODEL = /^(opencode|opencode-go)\/[a-z0-9][a-z0-9._-]*$/i;
