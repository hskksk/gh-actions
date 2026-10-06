import type { ModelCatalog } from "./model-catalog.js";
import { ALLOWED_MODEL, DEFAULT_MODEL, MODEL_ALIASES } from "./constants.js";

export { ALLOWED_MODEL, DEFAULT_MODEL, MODEL_ALIASES } from "./constants.js";

export const ALL_CMDS = [
  "/opencode-issue",
  "/opencode-ask",
  "/oc-issue",
  "/oc-ask",
  "/oci",
  "/oca",
  "/opencode",
  "/oc",
];

export const REPLY_CMDS = [
  "/opencode-issue",
  "/opencode-ask",
  "/oc-issue",
  "/oc-ask",
  "/oci",
  "/oca",
];

export const BUILD_CMDS = ["/opencode", "/oc"];

export const TRUSTED_COMMENT_ASSOC = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
export const TRUSTED_REPO_PERMS = new Set(["admin", "maintain", "write"]);

export type SlashMode = "" | "reply" | "build";

export function parseAllowlist(raw: string): string[] {
  return raw
    .split(/[, \n]+/)
    .map((s) => s.trim().replace(/^@/, ""))
    .filter(Boolean);
}

export function isAllowlisted(login: string | undefined, allowlist: string[]): boolean {
  return Boolean(login && allowlist.includes(login));
}

export function commentActorAuthorized(
  comment: { user?: { login?: string; type?: string }; author_association?: string } | undefined,
  allowlist: string[],
): boolean {
  if (!comment?.user || comment.user.type === "Bot") return false;
  if (isAllowlisted(comment.user.login, allowlist)) return true;
  return TRUSTED_COMMENT_ASSOC.has(comment.author_association ?? "");
}

export function triggerBody(
  eventName: string,
  payload: {
    comment?: { body?: string };
    issue?: { body?: string };
    pull_request?: { body?: string };
  },
): string {
  if (eventName === "issue_comment" || eventName === "pull_request_review_comment") {
    return payload.comment?.body ?? "";
  }
  if (eventName === "issues") {
    return payload.issue?.body ?? "";
  }
  if (eventName === "pull_request") {
    return payload.pull_request?.body ?? "";
  }
  return "";
}

export function stripNonTriggerSections(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, "").replace(/```[\s\S]*?```/g, "");
}

export function hasCmdInText(body: string, cmd: string): boolean {
  let from = 0;
  while (from <= body.length) {
    const i = body.indexOf(cmd, from);
    if (i === -1) return false;
    const beforeOk = i === 0 || body[i - 1] === " " || body[i - 1] === "\n";
    const end = i + cmd.length;
    const afterOk =
      end === body.length || body[end] === " " || body[end] === "\n" || body[end] === "\r";
    if (beforeOk && afterOk) return true;
    from = i + 1;
  }
  return false;
}

export function hasCmdAtLineStart(body: string, cmd: string): boolean {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === cmd || trimmed.startsWith(`${cmd} `)) {
      return true;
    }
  }
  return false;
}

export function detectMode(rawBody: string, eventName: string): SlashMode {
  const isComment =
    eventName === "issue_comment" || eventName === "pull_request_review_comment";
  const body = isComment ? rawBody : stripNonTriggerSections(rawBody);
  const matches = (cmd: string) =>
    isComment ? hasCmdInText(body, cmd) : hasCmdAtLineStart(body, cmd);

  for (const cmd of REPLY_CMDS) {
    if (matches(cmd)) return "reply";
  }
  for (const cmd of BUILD_CMDS) {
    if (matches(cmd)) return "build";
  }
  return "";
}

export function resolveModelToken(
  raw: string,
  catalog: ModelCatalog,
  defaultModel: string = DEFAULT_MODEL,
  onWarning?: (message: string) => void,
  positional = false,
): { model: string; explicit: boolean } {
  const token = raw.trim().replace(/^["']|["']$/g, "");
  if (!token) return { model: defaultModel, explicit: false };
  const resolved = positional ? catalog.resolvePositional(token) : catalog.resolve(token);
  if (resolved) return { model: resolved, explicit: true };
  if (!positional) {
    onWarning?.(`Unknown model "${token}"; using ${defaultModel}.`);
  }
  return { model: defaultModel, explicit: false };
}

/** @deprecated Use resolveModelToken with a model catalog */
export function normalizeModelId(
  raw: string,
  defaultModel: string = DEFAULT_MODEL,
  onWarning?: (message: string) => void,
): string {
  const aliasOnly: ModelCatalog = {
    resolve: (token) => MODEL_ALIASES[token.toLowerCase()] ?? null,
    resolvePositional: (token) => MODEL_ALIASES[token.toLowerCase()] ?? null,
  };
  return resolveModelToken(raw, aliasOnly, defaultModel, onWarning).model;
}

export function findTriggerLine(body: string, eventName: string): string {
  const isComment =
    eventName === "issue_comment" || eventName === "pull_request_review_comment";
  const working = isComment ? body : stripNonTriggerSections(body);
  const lines = working.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    for (const cmd of ALL_CMDS) {
      if (isComment) {
        if (hasCmdInText(line, cmd)) return line;
      } else if (trimmed === cmd || trimmed.startsWith(`${cmd} `)) {
        return trimmed;
      }
    }
  }
  return "";
}

function stripCommandPrefix(line: string): string {
  const trimmed = line.trim();
  const cmds = [...ALL_CMDS].sort((a, b) => b.length - a.length);
  for (const cmd of cmds) {
    if (trimmed === cmd) return "";
    if (trimmed.startsWith(`${cmd} `)) {
      return trimmed.slice(cmd.length + 1).trim();
    }
    const idx = trimmed.toLowerCase().indexOf(cmd);
    if (idx === -1) continue;
    const beforeOk = idx === 0 || trimmed[idx - 1] === " " || trimmed[idx - 1] === "\n";
    const end = idx + cmd.length;
    const afterOk =
      end === trimmed.length || trimmed[end] === " " || trimmed[end] === "\n" || trimmed[end] === "\r";
    if (beforeOk && afterOk) {
      return trimmed.slice(end).trim();
    }
  }
  return trimmed;
}

export function extractInstruction(
  body: string,
  eventName: string,
  cmdLine: string,
  cleanedLine: string,
): string {
  const linePart = stripCommandPrefix(cleanedLine);
  const lines = body.split(/\r?\n/);
  const isComment =
    eventName === "issue_comment" || eventName === "pull_request_review_comment";

  let foundIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isComment) {
      if (line === cmdLine || line.trim() === cmdLine.trim()) {
        foundIndex = i;
        break;
      }
    } else if (line.trim() === cmdLine.trim() || line.trim() === cleanedLine.trim()) {
      foundIndex = i;
      break;
    }
  }

  const tail = foundIndex >= 0 ? lines.slice(foundIndex + 1).join("\n").trim() : "";
  return [linePart, tail].filter((part) => part.length > 0).join("\n").trim();
}

export function parseModelFromBody(
  body: string,
  eventName: string,
  catalog: ModelCatalog,
  defaultModel: string = DEFAULT_MODEL,
  onWarning?: (message: string) => void,
): { model: string; prompt: string; instruction: string; modelExplicit: boolean } {
  const cmdLine = findTriggerLine(body, eventName);
  if (!cmdLine) {
    return { model: defaultModel, prompt: body, instruction: body.trim(), modelExplicit: false };
  }

  let model = defaultModel;
  let modelExplicit = false;
  let cleanedLine = cmdLine;

  const flagMatch = cmdLine.match(/(?:^|\s)(?:--model|-m|model:)\s+(\S+)/i);
  if (flagMatch) {
    const resolved = resolveModelToken(flagMatch[1], catalog, defaultModel, onWarning);
    model = resolved.model;
    modelExplicit = resolved.explicit;
    cleanedLine = cmdLine
      .replace(/(?:^|\s)(?:--model|-m|model:)\s+\S+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  } else {
    for (const cmd of ALL_CMDS) {
      const escaped = cmd.replace(/\//g, "\\/");
      const re = new RegExp(`(${escaped})\\s+(\\S+)`, "i");
      const match = cmdLine.match(re);
      if (!match) continue;
      const resolved = resolveModelToken(match[2], catalog, defaultModel, onWarning, true);
      if (!resolved.explicit) break;
      model = resolved.model;
      modelExplicit = true;
      cleanedLine = cmdLine.replace(re, "$1").replace(/\s{2,}/g, " ").trim();
      break;
    }
  }

  const instruction = extractInstruction(body, eventName, cmdLine, cleanedLine);
  const prompt =
    cleanedLine === cmdLine ? body : body.includes(cmdLine) ? body.replace(cmdLine, cleanedLine) : body;

  return { model, prompt, instruction, modelExplicit };
}
