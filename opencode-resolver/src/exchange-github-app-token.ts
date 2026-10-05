import * as core from "@actions/core";
import { getGithubAppToken } from "./github-app-token.js";

async function run(): Promise<void> {
  const oidcBaseUrl = process.env.OPENCODE_OIDC_BASE_URL || "https://api.opencode.ai";
  const token = await getGithubAppToken(oidcBaseUrl);
  core.setSecret(token);
  core.exportVariable("GH_TOKEN", token);
}

run().catch((error: unknown) => {
  if (error instanceof Error) {
    core.setFailed(error.message);
  } else {
    core.setFailed(String(error));
  }
});
