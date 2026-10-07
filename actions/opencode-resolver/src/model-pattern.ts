/** Turn a simple glob (`*`) into a regex; each `*` captures one segment for version compare. */
export function globToModelIdRegExp(glob: string): RegExp {
  const parts = glob.split("*");
  let pattern = "^";
  for (let i = 0; i < parts.length; i++) {
    pattern += parts[i].replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    if (i < parts.length - 1) {
      pattern += "(.+?)";
    }
  }
  pattern += "$";
  return new RegExp(pattern, "i");
}

/** Compare dotted numeric version segments (e.g. 4.1 vs 4). */
export function compareVersionSegments(a: string, b: string): number {
  const pa = a.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  const pb = b.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function pickLatestMatchingModelId(modelIds: string[], glob: string): string | null {
  const re = globToModelIdRegExp(glob);
  const matches: { modelId: string; versionKey: string }[] = [];
  for (const modelId of modelIds) {
    const m = re.exec(modelId);
    if (!m) continue;
    const versionKey = m[1] ?? modelId;
    matches.push({ modelId, versionKey });
  }
  if (matches.length === 0) return null;
  matches.sort((left, right) => compareVersionSegments(right.versionKey, left.versionKey));
  return matches[0].modelId;
}
