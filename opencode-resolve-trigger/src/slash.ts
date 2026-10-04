export const DEFAULT_MODEL = "opencode/big-pickle";

export const MODEL_ALIASES: Record<string, string> = {
  "big-pickle": DEFAULT_MODEL,
  pickle: DEFAULT_MODEL,
};

export const ALLOWED_MODEL = /^(opencode|opencode-go)\/[a-z0-9][a-z0-9._-]*$/i;

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

export function normalizeModelId(
  raw: string,
  defaultModel: string = DEFAULT_MODEL,
  onWarning?: (message: string) => void,
): string {
  const token = raw.trim().replace(/^["']|["']$/g, "");
  if (!token) return defaultModel;
  const alias = MODEL_ALIASES[token.toLowerCase()];
  if (alias) return alias;
  if (token.includes("/")) {
    if (!ALLOWED_MODEL.test(token)) {
      onWarning?.(`Invalid model "${token}"; using ${defaultModel}.`);
      return defaultModel;
    }
    return token;
  }
  if (/^[a-z0-9][a-z0-9._-]*$/i.test(token)) {
    return `opencode-go/${token}`;
  }
  onWarning?.(`Invalid model "${token}"; using ${defaultModel}.`);
  return defaultModel;
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

export function looksLikeModelToken(token: string): boolean {
  if (!token || token.startsWith("@") || token.startsWith("#")) return false;
  if (MODEL_ALIASES[token.toLowerCase()]) return true;
  if (token.includes("/")) return ALLOWED_MODEL.test(token);
  return /^[a-z0-9][a-z0-9._-]*$/i.test(token);
}

export function parseModelFromBody(
  body: string,
  eventName: string,
  defaultModel: string = DEFAULT_MODEL,
  onWarning?: (message: string) => void,
): { model: string; prompt: string } {
  const cmdLine = findTriggerLine(body, eventName);
  if (!cmdLine) {
    return { model: defaultModel, prompt: body };
  }

  let model = defaultModel;
  let cleanedLine = cmdLine;

  const flagMatch = cmdLine.match(/(?:^|\s)(?:--model|-m|model:)\s+(\S+)/i);
  if (flagMatch) {
    model = normalizeModelId(flagMatch[1], defaultModel, onWarning);
    cleanedLine = cmdLine
      .replace(/(?:^|\s)(?:--model|-m|model:)\s+\S+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  } else {
    for (const cmd of ALL_CMDS) {
      const escaped = cmd.replace(/\//g, "\\/");
      const re = new RegExp(`(${escaped})\\s+(\\S+)`, "i");
      const match = cmdLine.match(re);
      if (match && looksLikeModelToken(match[2])) {
        model = normalizeModelId(match[2], defaultModel, onWarning);
        cleanedLine = cmdLine.replace(re, "$1").replace(/\s{2,}/g, " ").trim();
        break;
      }
    }
  }

  if (cleanedLine === cmdLine) {
    return { model, prompt: body };
  }

  const prompt = body.includes(cmdLine) ? body.replace(cmdLine, cleanedLine) : body;
  return { model, prompt };
}
