import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
  commentActorAuthorized,
  detectMode,
  isAllowlisted,
  parseAllowlist,
  parseModelFromBody,
  TRUSTED_REPO_PERMS,
  triggerBody,
} from "./slash.js";

async function senderActorAuthorized(
  login: string | undefined,
  allowlist: string[],
  owner: string,
  repo: string,
  token: string,
): Promise<boolean> {
  if (!login) return false;
  if (isAllowlisted(login, allowlist)) return true;
  if (login === owner) return true;
  const octokit = getOctokit(token);
  try {
    const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: login,
    });
    return TRUSTED_REPO_PERMS.has(data.permission);
  } catch (error: unknown) {
    const status = (error as { status?: number }).status;
    if (status === 404) return false;
    throw error;
  }
}

async function triggerActorAuthorized(
  eventName: string,
  payload: {
    comment?: { user?: { login?: string; type?: string }; author_association?: string };
    sender?: { login?: string };
  },
  allowlist: string[],
  owner: string,
  repo: string,
  token: string,
): Promise<boolean> {
  if (eventName === "issue_comment" || eventName === "pull_request_review_comment") {
    return commentActorAuthorized(payload.comment, allowlist);
  }
  if (eventName === "issues" || eventName === "pull_request") {
    return senderActorAuthorized(payload.sender?.login, allowlist, owner, repo, token);
  }
  return false;
}

async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const allowlist = parseAllowlist(core.getInput("trigger-allowlist") || "");
  const defaultModel = core.getInput("default-model") || "opencode/big-pickle";
  const onWarning = (message: string) => core.warning(message);

  const eventName = context.eventName;
  const body = triggerBody(eventName, context.payload as Parameters<typeof triggerBody>[1]);
  const mode = detectMode(body, eventName);

  if (!mode) {
    core.info("No opencode slash command in trigger text; skipping OpenCode run.");
    core.setOutput("mode", "skip");
    return;
  }

  const authorized = await triggerActorAuthorized(
    eventName,
    context.payload as Parameters<typeof triggerActorAuthorized>[1],
    allowlist,
    context.repo.owner,
    context.repo.repo,
    token,
  );

  if (!authorized) {
    core.info("Trigger actor is not authorized for opencode; skipping OpenCode run.");
    core.setOutput("mode", "skip");
    return;
  }

  const { model, prompt, task } = parseModelFromBody(body, eventName, defaultModel, onWarning);
  core.info(`OpenCode model: ${model}`);
  core.setOutput("mode", mode);
  core.setOutput("prompt", prompt);
  core.setOutput("task", task);
  core.setOutput("model", model);
}

run().catch((error: unknown) => {
  if (error instanceof Error) {
    core.setFailed(error.message);
  } else {
    core.setFailed(String(error));
  }
});
