import { describe, expect, it } from "vitest";
import { createTestModelCatalog } from "../src/model-catalog.js";
import {
  commentActorAuthorized,
  detectMode,
  extractInstruction,
  hasCmdAtLineStart,
  hasCmdInText,
  parseModelFromBody,
  resolveModelToken,
  stripNonTriggerSections,
} from "../src/slash.js";

const testCatalog = createTestModelCatalog([
  "opencode/big-pickle",
  "opencode/kimi-k2.5",
  "opencode-go/kimi-k3",
  "opencode-go/glm-5.3-flash",
]);

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

describe("resolveModelToken", () => {
  it("resolves catalog models and aliases", () => {
    expect(resolveModelToken("big-pickle", testCatalog).model).toBe("opencode/big-pickle");
    expect(resolveModelToken("glm-5.3-flash", testCatalog).model).toBe("opencode-go/glm-5.3-flash");
    expect(resolveModelToken("opencode/kimi-k2.5", testCatalog).model).toBe("opencode/kimi-k2.5");
  });

  it("falls back when token is not in catalog", () => {
    const result = resolveModelToken("fix", testCatalog);
    expect(result.model).toBe("opencode/big-pickle");
    expect(result.explicit).toBe(false);
  });
});

describe("parseModelFromBody", () => {
  it("parses --model flag against catalog", () => {
    const { model, prompt, modelExplicit, instruction } = parseModelFromBody(
      "/oc --model kimi-k3 fix",
      "issue_comment",
      testCatalog,
    );
    expect(model).toBe("opencode-go/kimi-k3");
    expect(modelExplicit).toBe(true);
    expect(prompt).not.toContain("kimi-k3");
    expect(instruction).toBe("fix");
  });

  it("parses positional catalog model after command", () => {
    const { model, modelExplicit } = parseModelFromBody(
      "/oc opencode/kimi-k2.5",
      "issue_comment",
      testCatalog,
    );
    expect(model).toBe("opencode/kimi-k2.5");
    expect(modelExplicit).toBe(true);
  });

  it("does not treat normal words as models", () => {
    const { model, prompt, modelExplicit } = parseModelFromBody(
      "/oc fix the bug",
      "issue_comment",
      testCatalog,
    );
    expect(model).toBe("opencode/big-pickle");
    expect(modelExplicit).toBe(false);
    expect(prompt).toBe("/oc fix the bug");
  });

  it("keeps unknown tokens in the instruction", () => {
    const { model, modelExplicit, instruction } = parseModelFromBody(
      "/oc not-a-real-model do work",
      "issue_comment",
      testCatalog,
    );
    expect(model).toBe("opencode/big-pickle");
    expect(modelExplicit).toBe(false);
    expect(instruction).toContain("not-a-real-model");
  });
});

describe("extractInstruction", () => {
  it("collects text after the trigger line", () => {
    const body = "Some intro\n/oc opencode/kimi-k2.5 implement X\nMore detail";
    const instruction = extractInstruction(body, "issues", "/oc opencode/kimi-k2.5 implement X", "/oc implement X");
    expect(instruction).toBe("implement X\nMore detail");
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
