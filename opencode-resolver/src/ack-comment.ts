export function formatAcknowledgment(model: string, instruction: string): string {
  const instructionLine = instruction.trim() ? instruction.trim() : "（なし）";
  return [
    "指示を受け取ったよ。対応するから少し待ってね。",
    "",
    `利用モデル: ${model}`,
    `指示: ${instructionLine}`,
  ].join("\n");
}

export async function postAcknowledgmentComment(
  octokit: {
    rest: {
      issues: {
        createComment: (params: {
          owner: string;
          repo: string;
          issue_number: number;
          body: string;
        }) => Promise<unknown>;
      };
    };
  },
  owner: string,
  repo: string,
  eventName: string,
  payload: {
    issue?: { number: number };
    pull_request?: { number: number };
  },
  body: string,
): Promise<void> {
  const issueNumber =
    payload.issue?.number ??
    payload.pull_request?.number ??
    (() => {
      throw new Error(`Cannot post acknowledgment for event: ${eventName}`);
    })();

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}
