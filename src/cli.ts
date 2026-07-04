#!/usr/bin/env node

/*
 * Copyright 2026 IDevSec
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { promises as fs, existsSync, readFileSync } from "fs";
import readline from "readline";
import { resolve, dirname } from "path";
import { resolveAgent, verifyAgent, registerAgent, CreduentError, AgentNotFoundError } from "./client.js";
import { generateKeys, signDocument } from "./crypto.js";

// Read version dynamically — works in both ESM and CJS builds
function getCliVersion(): string {
    try {
        // Walk up from the compiled CLI file location to find package.json
        const cliDir = dirname(resolve(process.argv[1] ?? ""));
        const pkgPath = resolve(cliDir, "../../package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        return pkg.version ?? "unknown";
    } catch {
        return "unknown";
    }
}
const CLI_VERSION = getCliVersion();

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
    console.log(`
\x1b[1m\x1b[36m◆ CREDUENT CLI\x1b[0m \x1b[90m—\x1b[0m \x1b[1m\x1b[37mAI Agent Identity & Trust Protocol\x1b[0m
\x1b[90mVersion ${CLI_VERSION} | Developed by IDevSec

NPM   : https://www.npmjs.com/package/@idevsec/creduent-cli
GitHub: https://github.com/idevsec/creduent-cli\x1b[0m

\x1b[1m\x1b[32mUSAGE:\x1b[0m
  $ \x1b[1mcreduent\x1b[0m <command> [options]

\x1b[1m\x1b[36mCOMMANDS:\x1b[0m
  \x1b[1minit\x1b[0m \x1b[35m[options]\x1b[0m            \x1b[90mInitialize a new agent identity (agent.json + private_key.pem)\x1b[0m
  \x1b[1mresolve\x1b[0m \x1b[33m<agent-uri>\x1b[0m         \x1b[90mResolve an agent's attestation record\x1b[0m
  \x1b[1mverify\x1b[0m \x1b[33m<agent-uri>\x1b[0m          \x1b[90mVerify if an agent is trusted/verified\x1b[0m
  \x1b[1mregister\x1b[0m \x1b[35m[options]\x1b[0m         \x1b[90mRegister a new agent identity with the registry\x1b[0m
  \x1b[1mrenew\x1b[0m \x1b[35m[options]\x1b[0m            \x1b[90mRenew agent attestation validity period using private key\x1b[0m
  \x1b[1mwebhook register\x1b[0m \x1b[35m[opts]\x1b[0m     \x1b[90mRegister a webhook URL to receive protocol updates\x1b[0m
  \x1b[1mwebhook query\x1b[0m \x1b[35m[opts]\x1b[0m        \x1b[90mQuery registered webhook URL for an agent\x1b[0m
  \x1b[1mdiscover\x1b[0m \x1b[33m<uri>\x1b[0m \x1b[35m[opts]\x1b[0m        \x1b[90mDiscover an agent's capabilities (supports authentication)\x1b[0m

\x1b[1m\x1b[35mGLOBAL OPTIONS:\x1b[0m
  \x1b[1m--base-url\x1b[0m \x1b[33m<url>\x1b[0m          \x1b[90mUse a custom registry URL (default: https://creduent.idevsec.com)\x1b[0m
  \x1b[1m--help\x1b[0m                    \x1b[90mShow this help message\x1b[0m

\x1b[1m\x1b[35mINIT OPTIONS:\x1b[0m
  \x1b[1m--agent\x1b[0m \x1b[33m<uri>\x1b[0m             \x1b[90mCanonical agent URI (e.g. agent://myorg/mybot)\x1b[0m
  \x1b[1m--owner\x1b[0m \x1b[33m<owner>\x1b[0m           \x1b[90mOwner name/identifier\x1b[0m
  \x1b[1m--domain\x1b[0m \x1b[33m<domain>\x1b[0m         \x1b[90mAgent's DNS domain (e.g. myorg.com)\x1b[0m
  \x1b[1m--endpoint\x1b[0m \x1b[33m<url>\x1b[0m         \x1b[90mAgent's API endpoint (e.g. https://api.myorg.com/agent)\x1b[0m
  \x1b[1m--capabilities\x1b[0m \x1b[33m<list>\x1b[0m     \x1b[90mComma-separated capability tags (e.g. "chat,search")\x1b[0m
  \x1b[1m-y, --yes\x1b[0m                 \x1b[90mSkip interactive prompts and use defaults\x1b[0m
  \x1b[1m-f, --force\x1b[0m               \x1b[90mOverwrite existing private_key.pem and agent.json files\x1b[0m

\x1b[1m\x1b[35mREGISTER OPTIONS:\x1b[0m
  \x1b[1m--agent\x1b[0m \x1b[33m<uri>\x1b[0m             \x1b[90mCanonical agent URI (e.g. agent://myorg/mybot)\x1b[0m
  \x1b[1m--domain\x1b[0m \x1b[33m<domain>\x1b[0m         \x1b[90mAgent's DNS domain (e.g. myorg.com)\x1b[0m
  \x1b[1m--json-url\x1b[0m \x1b[33m<url>\x1b[0m         \x1b[90mURL serving the agent.json metadata file\x1b[0m
  \x1b[1m--meta\x1b[0m \x1b[33mkey=value\x1b[0m          \x1b[90mCustom metadata key-value pair (can be used multiple times)\x1b[0m

\x1b[1m\x1b[35mRENEW OPTIONS:\x1b[0m
  \x1b[1m--agent\x1b[0m \x1b[33m<uri>\x1b[0m             \x1b[90mAgent URI to renew\x1b[0m
  \x1b[1m--days\x1b[0m \x1b[33m<number>\x1b[0m           \x1b[90mDays from now for new expiry (default: 365)\x1b[0m
  \x1b[1m--key\x1b[0m \x1b[33m<path>\x1b[0m              \x1b[90mPath to private key PEM (default: private_key.pem)\x1b[0m

\x1b[1m\x1b[35mWEBHOOK OPTIONS:\x1b[0m
  \x1b[1m--agent\x1b[0m \x1b[33m<uri>\x1b[0m             \x1b[90mAgent URI\x1b[0m
  \x1b[1m--url\x1b[0m \x1b[33m<webhook-url>\x1b[0m       \x1b[90mWebhook target URL (only for webhook register)\x1b[0m
  \x1b[1m--key\x1b[0m \x1b[33m<path>\x1b[0m              \x1b[90mPath to private key PEM (default: private_key.pem)\x1b[0m

\x1b[1m\x1b[35mDISCOVER OPTIONS:\x1b[0m
  \x1b[1m--as\x1b[0m \x1b[33m<my-agent-uri>\x1b[0m       \x1b[90mYour agent's URI for authenticated discovery\x1b[0m
  \x1b[1m--key\x1b[0m \x1b[33m<path>\x1b[0m              \x1b[90mPath to private key PEM (default: private_key.pem)\x1b[0m

\x1b[1m\x1b[33mEXAMPLES:\x1b[0m
  \x1b[90m# Initialize a new agent identity interactively\x1b[0m
  $ \x1b[1mcreduent init\x1b[0m

  \x1b[90m# Initialize automatically with flags\x1b[0m
  $ \x1b[1mcreduent init\x1b[0m --agent agent://myorg/mybot --domain myorg.com -y

  \x1b[90m# Resolve an agent's record\x1b[0m
  $ \x1b[1mcreduent resolve\x1b[0m agent://idevsec/steward

  \x1b[90m# Verify agent trust level\x1b[0m
  $ \x1b[1mcreduent verify\x1b[0m agent://idevsec/steward

  \x1b[90m# Register an agent\x1b[0m
  $ \x1b[1mcreduent register\x1b[0m --agent agent://myorg/mybot --domain myorg.com --json-url https://myorg.com/agent.json

  \x1b[90m# Renew agent attestation validity\x1b[0m
  $ \x1b[1mcreduent renew\x1b[0m --agent agent://myorg/mybot --days 180

  \x1b[90m# Register a webhook for agent events\x1b[0m
  $ \x1b[1mcreduent webhook register\x1b[0m --agent agent://myorg/mybot --url https://example.com/hooks/attestation

  \x1b[90m# Discover capabilities of an agent\x1b[0m
  $ \x1b[1mcreduent discover\x1b[0m agent://idevsec/steward
  `);
}

export function parseFlags(args: string[]) {
    const flags: Record<string, string> = {};
    const meta: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--meta" && args[i + 1]) {
            const [k, v] = args[i + 1].split("=");
            if (k && v) meta[k] = v;
            i++;
        } else if (arg.startsWith("--")) {
            const flagName = arg.slice(2);
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                flags[flagName] = nextArg;
                i++;
            } else {
                flags[flagName] = "true";
            }
        } else if (arg.startsWith("-")) {
            const flagName = arg.slice(1);
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                flags[flagName] = nextArg;
                i++;
            } else {
                flags[flagName] = "true";
            }
        }
    }
    return { flags, meta };
}

function printRecord(record: any) {
    console.log(`
\x1b[1m\x1b[32m┌── CREDUENT AGENT ATTESTATION RECORD ───────────────────────────────────\x1b[0m
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mAgent ID\x1b[0m    : \x1b[36m${record.agent_id}\x1b[0m
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mIssuer\x1b[0m      : \x1b[90m${record.issuer}\x1b[0m
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mTrust Level\x1b[0m : \x1b[1m\x1b[33m${record.level.toUpperCase()}\x1b[0m
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mDomain\x1b[0m      : \x1b[4m${record.domain}\x1b[0m
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mPublic Key\x1b[0m  : \x1b[35m${record.public_key}\x1b[0m
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mRegistered\x1b[0m  : ${record.registered_at || "N/A"}
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mIssued At\x1b[0m   : ${record.issued_at}
\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mExpires At\x1b[0m  : ${record.expires_at}
\x1b[1m\x1b[32m└────────────────────────────────────────────────────────────────────────\x1b[0m
`);
}

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function promptUser(question: string, defaultValue: string): Promise<string> {
    const answer = await askQuestion(`${question} [${defaultValue}]: `);
    return answer || defaultValue;
}

async function main() {
    if (!command || command === "--help" || command === "-h" || command === "help") {
        printHelp();
        process.exit(0);
    }

    const { flags, meta } = parseFlags(args.slice(1));
    const clientOptions = flags["base-url"] ? { baseUrl: flags["base-url"] } : undefined;

    // ── init ─────────────────────────────────────────────────────────────────
    if (command === "init") {
        const privateKeyPath = "private_key.pem";
        const agentJsonPath = "agent.json";

        const force = "force" in flags || "f" in flags || args.includes("-f") || args.includes("--force");
        if (!force) {
            if (existsSync(privateKeyPath)) {
                console.error(
                    `\x1b[1m\x1b[31mError: ${privateKeyPath} already exists. Aborting to prevent overwriting existing keys. Use --force to override.\x1b[0m`
                );
                process.exit(1);
            }
            if (existsSync(agentJsonPath)) {
                console.error(
                    `\x1b[1m\x1b[31mError: ${agentJsonPath} already exists. Aborting to prevent overwriting metadata. Use --force to override.\x1b[0m`
                );
                process.exit(1);
            }
        }

        let agent = flags["agent"];
        let owner = flags["owner"];
        let domain = flags["domain"];
        let endpoint = flags["endpoint"];
        let capabilitiesStr = flags["capabilities"];
        const skipPrompts = "yes" in flags || "y" in flags || args.includes("-y") || args.includes("--yes");

        if (!skipPrompts) {
            console.log("\x1b[1m\x1b[36m◆ Initializing Creduent Agent Identity\x1b[0m");
            console.log("\x1b[90mPlease answer the following prompts to construct your agent.json:\x1b[0m\n");

            agent = await promptUser("Agent ID (URI)", agent || "agent://myorg/mybot");
            owner = await promptUser("Owner name", owner || "My Organization");
            domain = await promptUser("DNS domain", domain || "myorg.com");
            endpoint = await promptUser("Endpoint URL", endpoint || "https://api.myorg.com/agent");
            capabilitiesStr = await promptUser("Capabilities (comma-separated)", capabilitiesStr || "chat, search");
        } else {
            agent = agent || "agent://myorg/mybot";
            owner = owner || "My Organization";
            domain = domain || "myorg.com";
            endpoint = endpoint || "https://api.myorg.com/agent";
            capabilitiesStr = capabilitiesStr || "chat, search";
        }

        const capabilities = capabilitiesStr
            ? capabilitiesStr
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
            : [];

        console.log(`\n\x1b[36mGenerating Ed25519 key pair...\x1b[0m`);
        const { privateKeyPem, publicKeyStr } = generateKeys();

        const draftDoc = {
            version: "1.0",
            agent_id: agent,
            owner,
            public_key: publicKeyStr,
            endpoint,
            capabilities,
        };

        console.log(`\x1b[36mSigning agent.json metadata...\x1b[0m`);
        const signedDoc = signDocument(draftDoc, privateKeyPem);

        try {
            await fs.writeFile(privateKeyPath, privateKeyPem, { encoding: "utf-8", mode: 0o600 });
            console.log(
                `\x1b[1m\x1b[32mPrivate key saved to:\x1b[0m ${privateKeyPath} \x1b[90m(KEEP THIS SECRET!)\x1b[0m`
            );

            await fs.writeFile(agentJsonPath, JSON.stringify(signedDoc, null, 2), "utf-8");
            console.log(`\x1b[1m\x1b[32mSigned agent.json saved to:\x1b[0m ${agentJsonPath}\n`);

            console.log(`\x1b[1m\x1b[33mYOUR PUBLIC KEY:\x1b[0m`);
            console.log(`  \x1b[36m${publicKeyStr}\x1b[0m\n`);

            console.log(`\x1b[1m\x1b[32mSetup completed successfully!\x1b[0m`);
            console.log(`To publish and verify this identity:`);
            console.log(
                `  1. Host \x1b[1magent.json\x1b[0m at: \x1b[4mhttps://${domain}/.well-known/agent.json\x1b[0m`
            );
            console.log(
                `  2. Add a DNS TXT record for \x1b[1m_creduent.${domain}\x1b[0m containing: \x1b[36m${agent}\x1b[0m`
            );
            console.log(`  3. Register your agent:`);
            console.log(
                `     \x1b[1mcreduent register --agent ${agent} --domain ${domain} --json-url https://${domain}/.well-known/agent.json\x1b[0m\n`
            );
        } catch (err) {
            console.error(`\x1b[1m\x1b[31mError writing files:\x1b[0m ${err}`);
            process.exit(1);
        }
    }

    // ── resolve ──────────────────────────────────────────────────────────────
    else if (command === "resolve") {
        const uri = args[1];
        if (!uri) {
            console.error(
                "\x1b[1m\x1b[31mError: Please provide an agent URI.\x1b[0m\n\x1b[90m   Usage: creduent resolve agent://domain/name\x1b[0m"
            );
            process.exit(1);
        }
        try {
            console.log(`\n\x1b[36mResolving:\x1b[0m \x1b[1m${uri}\x1b[0m`);
            const record = await resolveAgent(uri, clientOptions);
            printRecord(record);
        } catch (err) {
            if (err instanceof AgentNotFoundError) {
                console.error(`\x1b[1m\x1b[31mAgent not found:\x1b[0m ${uri}`);
            } else if (err instanceof CreduentError) {
                console.error(`\x1b[1m\x1b[31mRegistry error:\x1b[0m ${err.message}`);
            } else {
                console.error(`\x1b[1m\x1b[31mUnexpected error:\x1b[0m ${err}`);
            }
            process.exit(1);
        }
    }

    // ── verify ───────────────────────────────────────────────────────────────
    else if (command === "verify") {
        const uri = args[1];
        if (!uri) {
            console.error(
                "\x1b[1m\x1b[31mError: Please provide an agent URI.\x1b[0m\n\x1b[90m   Usage: creduent verify agent://domain/name\x1b[0m"
            );
            process.exit(1);
        }
        try {
            console.log(`\n\x1b[36mVerifying:\x1b[0m \x1b[1m${uri}\x1b[0m`);
            const result = await verifyAgent(uri, clientOptions);
            if (result.valid) {
                console.log(`\x1b[1m\x1b[32mCryptographically VERIFIED!\x1b[0m`);
                console.log(`\x1b[90mAgent ID:\x1b[0m     \x1b[36m${result.agent_id}\x1b[0m`);
                console.log(`\x1b[90mOwner:\x1b[0m        ${result.document?.owner}`);
                console.log(`\x1b[90mCapabilities:\x1b[0m ${result.document?.capabilities?.join(", ")}\n`);
            } else {
                console.log(`\x1b[1m\x1b[31mVerification failed:\x1b[0m ${result.reason}\n`);
                process.exit(1);
            }
        } catch (err) {
            if (err instanceof CreduentError) {
                console.error(`\x1b[1m\x1b[31mRegistry error:\x1b[0m ${err.message}`);
            } else {
                console.error(`\x1b[1m\x1b[31mUnexpected error:\x1b[0m ${err}`);
            }
            process.exit(1);
        }
    }

    // ── register ─────────────────────────────────────────────────────────────
    else if (command === "register") {
        const agent = flags["agent"];
        const domain = flags["domain"];
        const jsonUrl = flags["json-url"];

        if (!agent || !domain || !jsonUrl) {
            console.error("\x1b[1m\x1b[31mError: Missing required flags.\x1b[0m");
            console.error(
                "\x1b[90m   Usage: creduent register --agent <uri> --domain <domain> --json-url <url>\x1b[0m"
            );
            process.exit(1);
        }

        try {
            console.log(`\n\x1b[36mRegistering agent:\x1b[0m \x1b[1m${agent}\x1b[0m`);
            const record = await registerAgent(
                { agent_id: agent, domain, agent_json_url: jsonUrl, metadata: meta },
                clientOptions
            );
            console.log("\x1b[1m\x1b[32mAgent registered successfully!\x1b[0m");
            printRecord(record);
        } catch (err) {
            if (err instanceof CreduentError) {
                console.error(`\x1b[1m\x1b[31mRegistry error:\x1b[0m ${err.message}`);
            } else {
                console.error(`\x1b[1m\x1b[31mUnexpected error:\x1b[0m ${err}`);
            }
            process.exit(1);
        }
    }

    // ── renew ────────────────────────────────────────────────────────────────
    else if (command === "renew") {
        const agent = flags["agent"];
        const daysStr = flags["days"];
        const keyPath = flags["key"] || "./private_key.pem";

        if (!agent) {
            console.error(
                "\x1b[1m\x1b[31mError: Please provide an agent URI via --agent.\x1b[0m\n\x1b[90m   Usage: creduent renew --agent <uri> [--days <number>] [--key <path>]\x1b[0m"
            );
            process.exit(1);
        }

        const days = daysStr ? parseInt(daysStr, 10) : 365;
        if (isNaN(days)) {
            console.error("\x1b[1m\x1b[31mError: Invalid value for --days.\x1b[0m");
            process.exit(1);
        }

        try {
            const { loadPrivateKey, signPayload } = await import("./crypto.js");
            const privateKeyPem = loadPrivateKey(keyPath);

            // Calculates new_expires_at as now + days in UTC ISO format (no ms)
            const newExpiresAtDate = new Date();
            newExpiresAtDate.setDate(newExpiresAtDate.getDate() + days);
            const new_expires_at = newExpiresAtDate.toISOString().replace(/\.\d{3}/, "");

            const payload = {
                agent_id: agent,
                new_expires_at,
            };

            console.log(`\n\x1b[36mSigning renewal request for agent:\x1b[0m \x1b[1m${agent}\x1b[0m`);
            const signature = signPayload(payload, privateKeyPem);

            console.log(`\x1b[36mSending renewal request to registry...\x1b[0m`);
            const record = await (
                await import("./client.js")
            ).renewAgent({ agent_id: agent, new_expires_at, signature }, clientOptions);

            console.log("\x1b[1m\x1b[32mAgent renewed successfully!\x1b[0m");
            printRecord(record);
        } catch (err: any) {
            console.error(`\x1b[1m\x1b[31mError:\x1b[0m ${err.message || err}`);
            process.exit(1);
        }
    }

    // ── webhook ──────────────────────────────────────────────────────────────
    else if (command === "webhook") {
        const subCommand = args[1];
        if (subCommand === "register") {
            const agent = flags["agent"];
            const url = flags["url"];
            const keyPath = flags["key"] || "./private_key.pem";

            if (!agent || !url) {
                console.error("\x1b[1m\x1b[31mError: Missing required flags.\x1b[0m");
                console.error(
                    "\x1b[90m   Usage: creduent webhook register --agent <uri> --url <webhook-url> [--key <path>]\x1b[0m"
                );
                process.exit(1);
            }

            try {
                const { loadPrivateKey, signPayload } = await import("./crypto.js");
                const privateKeyPem = loadPrivateKey(keyPath);

                const payload = {
                    agent_id: agent,
                    webhook_url: url,
                };

                console.log(`\n\x1b[36mSigning webhook registration for agent:\x1b[0m \x1b[1m${agent}\x1b[0m`);
                const signature = signPayload(payload, privateKeyPem);

                console.log(`\x1b[36mRegistering webhook URL: ${url}...\x1b[0m`);
                const result = await (
                    await import("./client.js")
                ).registerWebhook({ agent_id: agent, webhook_url: url, signature }, clientOptions);
                console.log("\x1b[1m\x1b[32mWebhook registered successfully!\x1b[0m");
                console.log(`\x1b[90mAgent ID:\x1b[0m    \x1b[36m${result.agent_id}\x1b[0m`);
                console.log(`\x1b[90mWebhook URL:\x1b[0m \x1b[4m${result.webhook_url}\x1b[0m\n`);
            } catch (err: any) {
                console.error(`\x1b[1m\x1b[31mError:\x1b[0m ${err.message || err}`);
                process.exit(1);
            }
        } else if (subCommand === "query") {
            const agent = flags["agent"];
            if (!agent) {
                console.error(
                    "\x1b[1m\x1b[31mError: Please provide an agent URI via --agent.\x1b[0m\n\x1b[90m   Usage: creduent webhook query --agent <uri>\x1b[0m"
                );
                process.exit(1);
            }

            try {
                console.log(`\n\x1b[36mQuerying webhook for:\x1b[0m \x1b[1m${agent}\x1b[0m`);
                const result = await (await import("./client.js")).queryWebhook(agent, clientOptions);
                console.log(`\x1b[90mAgent ID:\x1b[0m    \x1b[36m${result.agent_id}\x1b[0m`);
                console.log(`\x1b[90mWebhook URL:\x1b[0m \x1b[4m${result.webhook_url}\x1b[0m\n`);
            } catch (err: any) {
                console.error(`\x1b[1m\x1b[31mError:\x1b[0m ${err.message || err}`);
                process.exit(1);
            }
        } else {
            console.error("\x1b[1m\x1b[31mError: Invalid webhook sub-command. Must be 'register' or 'query'.\x1b[0m");
            console.error(
                "\x1b[90m   Usage:\x1b[0m\n     creduent webhook register --agent <uri> --url <url>\n     creduent webhook query --agent <uri>"
            );
            process.exit(1);
        }
    }

    // ── discover ─────────────────────────────────────────────────────────────
    else if (command === "discover") {
        const targetUri = args[1];
        const asAgent = flags["as"];
        const keyPath = flags["key"] || "./private_key.pem";

        if (!targetUri) {
            console.error(
                "\x1b[1m\x1b[31mError: Please provide a target agent URI to discover.\x1b[0m\n\x1b[90m   Usage: creduent discover <target-uri> [--as <my-agent-uri>] [--key <path>]\x1b[0m"
            );
            process.exit(1);
        }

        try {
            let myAgentId: string | undefined;
            let privateKeyPem: string | undefined;

            if (asAgent) {
                const { loadPrivateKey } = await import("./crypto.js");
                myAgentId = asAgent;
                privateKeyPem = loadPrivateKey(keyPath);
                console.log(`\n\x1b[36mDiscovering (Authenticated as ${asAgent}):\x1b[0m \x1b[1m${targetUri}\x1b[0m`);
            } else {
                console.log(`\n\x1b[36mDiscovering (Public):\x1b[0m \x1b[1m${targetUri}\x1b[0m`);
            }

            const result = await (
                await import("./client.js")
            ).discoverAgent(targetUri, myAgentId, privateKeyPem, clientOptions);

            if (result.error && !result.capabilities) {
                console.error(`\x1b[1m\x1b[31mDiscovery failed:\x1b[0m ${result.error}`);
                process.exit(1);
            }

            console.log(
                `\x1b[1m\x1b[32m┌── DISCOVERY RESULTS ───────────────────────────────────────────────────\x1b[0m`
            );
            console.log(
                `\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mTarget Agent\x1b[0m  : \x1b[36m${result.target_agent_id}\x1b[0m`
            );
            console.log(
                `\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mEndpoint\x1b[0m      : \x1b[4m${result.endpoint || "N/A"}\x1b[0m`
            );
            console.log(
                `\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mAuthenticated\x1b[0m : ${result.authenticated ? "\x1b[1m\x1b[32mYES (Private Capabilities Included)\x1b[0m" : "\x1b[1m\x1b[33mNO (Public Capabilities Only)\x1b[0m"}`
            );
            if (result.error) {
                console.log(`\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mWarning/Error\x1b[0m : \x1b[31m${result.error}\x1b[0m`);
            }
            console.log(`\x1b[1m\x1b[32m│\x1b[0m  \x1b[1mCapabilities\x1b[0m  :`);
            if (result.capabilities && result.capabilities.length > 0) {
                for (const cap of result.capabilities) {
                    const capStr = typeof cap === "object" ? JSON.stringify(cap) : cap;
                    console.log(`\x1b[1m\x1b[32m│\x1b[0m    - \x1b[35m${capStr}\x1b[0m`);
                }
            } else {
                console.log(`\x1b[1m\x1b[32m│\x1b[0m    (None listed)`);
            }
            console.log(
                `\x1b[1m\x1b[32m└────────────────────────────────────────────────────────────────────────\x1b[0m\n`
            );
        } catch (err: any) {
            console.error(`\x1b[1m\x1b[31mUnexpected error:\x1b[0m ${err.message || err}`);
            process.exit(1);
        }
    } else {
        console.error(`\x1b[1m\x1b[31mUnknown command:\x1b[0m "${command}"`);
        printHelp();
        process.exit(1);
    }
}

const isEntrypoint =
    process.argv[1] &&
    (process.argv[1].endsWith("cli.js") || process.argv[1].endsWith("cli.ts") || process.argv[1].endsWith("creduent"));
if (isEntrypoint) {
    main();
}
