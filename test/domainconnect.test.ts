import { test, describe } from "node:test";
import assert from "node:assert";
import { discoverDomainConnect } from "../src/domainconnect.js";
import { parseFlags } from "../src/cli.js";

describe("Domain Connect Module Tests", () => {
    test("discoverDomainConnect returns valid settings for Cloudflare-managed domain", async () => {
        const settings = await discoverDomainConnect("idevsec.com");
        assert.ok(settings !== null, "Expected Domain Connect settings for idevsec.com");
        assert.strictEqual(typeof settings.providerDisplayName, "string");
        assert.ok(settings.urlSyncUX.includes("cloudflare.com"), "Expected Cloudflare UX URL");
    });

    test("discoverDomainConnect returns null for unsupported or invalid domain", async () => {
        const settings = await discoverDomainConnect("invalid-non-existent-subdomain-123456789.org");
        assert.strictEqual(settings, null);
    });

    test("parseFlags correctly parses Domain Connect flags", () => {
        const args = ["--auto-dns", "--cloudflare-token", "cf_tok_12345"];
        const { flags } = parseFlags(args);

        assert.strictEqual(flags["auto-dns"], "true");
        assert.strictEqual(flags["cloudflare-token"], "cf_tok_12345");
    });
});

