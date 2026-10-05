import { describe, expect, it } from "vitest";
import {
  commentActorAuthorized,
  detectMode,
  hasCmdAtLineStart,
  hasCmdInText,
  normalizeModelId,
  parseModelFromBody,
  stripNonTriggerSections,
} from "../src/slash.js";

describe("detectMode", () => {
  it("detects reply commands in comments", () => {
    expect(detectMode("please /oci look at this", "issue_comment")).toBe("reply");
  });

  it("detects build commands at line start in issue bodies", () => {
    const body = "Some intro\n/oc fix the bug\nmore text";
    expect(detectMode(body, "issues")).toBe("build");
  });

  it("ignores /oc inside code fences in issue bodies", () => {
    const body = "```\n/oc\n```\n/oc build";
    expect(detectMode(body, "issues")).toBe("build");
  });

  it("returns empty when no command", () => {
    expect(detectMode("hello", "issue_comment")).toBe("");
  });
});

describe("hasCmdInText", () => {
  it("requires word boundaries", () => {
    expect(hasCmdInText("/oc", "/oc")).toBe(true);
    expect(hasCmdInText("foo/oc bar", "/oc")).toBe(false);
    expect(hasCmdInText("run /oc now", "/oc")).toBe(true);
  });
});

describe("hasCmdAtLineStart", () => {
  it("matches line-start commands only", () => {
    expect(hasCmdAtLineStart("  /oc model:x\n", "/oc")).toBe(true);
    expect(hasCmdAtLineStart("text /oc\n", "/oc")).toBe(false);
  });
});

describe("stripNonTriggerSections", () => {
  it("removes html comments and fenced code", () => {
    const raw = "<!-- /oc -->\n```\n/oc\n```\n/oc";
    expect(stripNonTriggerSections(raw).trim()).toBe("/oc");
  });
});

describe("normalizeModelId", () => {
  it("resolves aliases and bare go ids", () => {
    expect(normalizeModelId("big-pickle")).toBe("opencode/big-pickle");
    expect(normalizeModelId("glm-5.3-flash")).toBe("opencode-go/glm-5.3-flash");
    expect(normalizeModelId("opencode/kimi-k2.5")).toBe("opencode/kimi-k2.5");
  });

  it("falls back on invalid models", () => {
    expect(normalizeModelId("not/a/good/model")).toBe("opencode/big-pickle");
  });
});

describe("parseModelFromBody", () => {
  it("parses --model flag", () => {
    const { model, prompt } = parseModelFromBody("/oc --model kimi-k3", "issue_comment");
    expect(model).toBe("opencode-go/kimi-k3");
    expect(prompt).toContain("/oc");
    expect(prompt).not.toContain("kimi-k3");
  });

  it("parses positional model after command", () => {
    const { model } = parseModelFromBody("/oc opencode/kimi-k2.5", "issue_comment");
    expect(model).toBe("opencode/kimi-k2.5");
  });

  it("does not treat normal words as positional models", () => {
    const { model, prompt } = parseModelFromBody("/oc fix the bug", "issue_comment");
    expect(model).toBe("opencode/big-pickle");
    expect(prompt).toBe("/oc fix the bug");
  });
});

describe("commentActorAuthorized", () => {
  it("allows trusted association", () => {
    expect(
      commentActorAuthorized(
        { user: { login: "alice", type: "User" }, author_association: "MEMBER" },
        [],
      ),
    ).toBe(true);
  });

  it("denies bots", () => {
    expect(
      commentActorAuthorized(
        { user: { login: "bot", type: "Bot" }, author_association: "NONE" },
        [],
      ),
    ).toBe(false);
  });

  it("allows allowlisted users", () => {
    expect(
      commentActorAuthorized(
        { user: { login: "guest", type: "User" }, author_association: "NONE" },
        ["guest"],
      ),
    ).toBe(true);
  });
});
