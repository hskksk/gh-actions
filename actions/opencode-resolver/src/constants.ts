export const DEFAULT_MODEL = "opencode/big-pickle";

export const MODEL_ALIASES: Record<string, string> = {
  "big-pickle": DEFAULT_MODEL,
  pickle: DEFAULT_MODEL,
};

export const ALLOWED_MODEL = /^(opencode|opencode-go)\/[a-z0-9][a-z0-9._-]*$/i;
