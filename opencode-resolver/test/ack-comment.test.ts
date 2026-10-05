import { describe, expect, it } from "vitest";
import { formatAcknowledgment } from "../src/ack-comment.js";

describe("formatAcknowledgment", () => {
  it("formats the acknowledgment comment in Japanese", () => {
    const body = formatAcknowledgment("opencode/kimi-k2.5", "fix the login bug");
    expect(body).toContain("指示を受け取ったよ");
    expect(body).toContain("利用モデル: opencode/kimi-k2.5");
    expect(body).toContain("指示: fix the login bug");
  });

  it("uses a placeholder when instruction is empty", () => {
    expect(formatAcknowledgment("opencode/big-pickle", "")).toContain("指示: （なし）");
  });
});
