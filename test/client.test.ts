import { test, describe } from "node:test";
import assert from "node:assert";
import { normalizeAgentUri, CreduentError, AgentNotFoundError } from "../src/client.js";

describe("Client Module Tests", () => {
  test("normalizeAgentUri normalizes standard and non-standard agent URIs", () => {
    assert.strictEqual(normalizeAgentUri("agent://myorg/mybot"), "agent://myorg/mybot");
    assert.strictEqual(normalizeAgentUri("agent:/myorg/mybot"), "agent://myorg/mybot");
    assert.strictEqual(normalizeAgentUri("agent:myorg/mybot"), "agent://myorg/mybot");
    assert.strictEqual(normalizeAgentUri("myorg/mybot"), "agent://myorg/mybot");
    assert.strictEqual(normalizeAgentUri("  agent://myorg/mybot  "), "agent://myorg/mybot");
  });

  test("CreduentError is instantiated with correct properties", () => {
    const error = new CreduentError("Some error message", 400, "Bad Request");
    assert.strictEqual(error.message, "Some error message");
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.responseText, "Bad Request");
    assert.ok(error instanceof Error);
  });

  test("AgentNotFoundError is instantiated with correct properties", () => {
    const error = new AgentNotFoundError("agent://myorg/mybot");
    assert.strictEqual(error.statusCode, 404);
    assert.ok(error.message.includes("agent://myorg/mybot"));
    assert.ok(error instanceof CreduentError);
  });
});
