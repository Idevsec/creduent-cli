import { test, describe } from "node:test";
import assert from "node:assert";
import { parseFlags } from "../src/cli.js";

describe("CLI Flags Parser Tests", () => {
    test("parseFlags parses double-dash flags with arguments", () => {
        const args = ["--agent", "agent://myorg/mybot", "--domain", "myorg.com"];
        const { flags, meta } = parseFlags(args);

        assert.strictEqual(flags["agent"], "agent://myorg/mybot");
        assert.strictEqual(flags["domain"], "myorg.com");
        assert.deepStrictEqual(meta, {});
    });

    test("parseFlags parses boolean/argument-less flags", () => {
        const args = ["--yes", "-f"];
        const { flags } = parseFlags(args);

        assert.strictEqual(flags["yes"], "true");
        assert.strictEqual(flags["f"], "true");
    });

    test("parseFlags parses meta key-value pairs correctly", () => {
        const args = ["--meta", "env=production", "--meta", "version=1.0"];
        const { flags, meta } = parseFlags(args);

        assert.strictEqual(meta["env"], "production");
        assert.strictEqual(meta["version"], "1.0");
    });
});
