import { test, describe } from "node:test";
import assert from "node:assert";
import { generateKeys, signDocument, signPayload } from "../src/crypto.js";

describe("Crypto Module Tests", () => {
  test("generateKeys generates valid Ed25519 keys", () => {
    const { privateKeyPem, publicKeyStr } = generateKeys();
    
    assert.ok(privateKeyPem.includes("BEGIN PRIVATE KEY"));
    assert.ok(privateKeyPem.includes("END PRIVATE KEY"));
    assert.ok(publicKeyStr.startsWith("ed25519:"));
    assert.strictEqual(Buffer.from(publicKeyStr.split(":")[1], "base64").length, 32);
  });

  test("signDocument signs an agent.json metadata payload", () => {
    const { privateKeyPem, publicKeyStr } = generateKeys();
    const draft = {
      agent_id: "agent://myorg/mybot",
      owner: "My Org",
      public_key: publicKeyStr,
      endpoint: "https://api.myorg.com/agent",
      capabilities: ["chat"]
    };

    const signed = signDocument(draft, privateKeyPem);
    assert.strictEqual(signed.version, "1.0");
    assert.ok(signed.issued_at);
    assert.ok(signed.signature);
    assert.strictEqual(typeof signed.signature, "string");
  });

  test("signPayload signs custom payloads", () => {
    const { privateKeyPem } = generateKeys();
    const payload = {
      agent_id: "agent://myorg/mybot",
      new_expires_at: "2027-06-27T15:00:00Z"
    };

    const signature = signPayload(payload, privateKeyPem);
    assert.ok(signature);
    assert.strictEqual(typeof signature, "string");
  });
});
