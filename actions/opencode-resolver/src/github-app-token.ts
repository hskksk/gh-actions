import * as core from "@actions/core";

const DEFAULT_OIDC_BASE_URL = "https://api.opencode.ai";

export async function getGithubAppToken(oidcBaseUrl: string = DEFAULT_OIDC_BASE_URL): Promise<string> {
  let oidcToken: string;
  try {
    oidcToken = await core.getIDToken("opencode-github-action");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not fetch an OIDC token (${message}). Ensure the job has id-token: write.`,
    );
  }

  const base = oidcBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/exchange_github_app_token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oidcToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `App token exchange failed: ${response.status} ${response.statusText} - ${await response.text()}`,
    );
  }

  const json = (await response.json()) as { token: string };
  if (!json.token) {
    throw new Error("App token exchange returned no token");
  }
  return json.token;
}
