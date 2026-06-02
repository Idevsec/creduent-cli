#!/usr/bin/env node

import { promises as fs, existsSync } from "fs";
import readline from "readline";
import { resolveAgent, verifyAgent, registerAgent, CreduentError, AgentNotFoundError } from "./client.js";
import { generateKeys, signDocument } from "./crypto.js";

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
\x1b[1m\x1b[36m◆ CREDUENT CLI\x1b[0m \x1b[90m—\x1b[0m \x1b[1m\x1b[37mAI Agent Identity & Trust Protocol\x1b[0m
\x1b[90mVersion 0.1.0 | Developed by IDevSec

NPM   : https://www.npmjs.com/package/@idevsec/creduent-cli
GitHub: https://github.com/idevsec/creduent-cli\x1b[0m

\x1b[1m\x1b[32mUSAGE:\x1b[0m
  $ \x1b[1mcreduent\x1b[0m <command> [options]

\x1b[1m\x1b[36mCOMMANDS:\x1b[0m
  \x1b[1minit\x1b[0m \x1b[35m[options]\x1b[0m            \x1b[90mInitialize a new agent identity (agent.json + private_key.pem)\x1b[0m
  \x1b[1mresolve\x1b[0m \x1b[33m<agent-uri>\x1b[0m         \x1b[90mResolve an agent's attestation record\x1b[0m
  \x1b[1mverify\x1b[0m \x1b[33m<agent-uri>\x1b[0m          \x1b[90mVerify if an agent is trusted/verified\x1b[0m
  \x1b[1mregister\x1b[0m \x1b[35m[options]\x1b[0m         \x1b[90mRegister a new agent identity with the registry\x1b[0m

\x1b[1m\x1b[35mGLOBAL OPTIONS:\x1b[0m
  \x1b[1m--base-url\x1b[0m \x1b[33m<url>\x1b[0m          \x1b[90mUse a custom registry URL (default: https://api.idevsec.com)\x1b[0m
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

\x1b[1m\x1b[33mEXAMPLES:\x1b[0m
  \x1b[90m# Initialize a new agent identity interactively\x1b[0m
  $ \x1b[1mcreduent init\x1b[0m

  \x1b[90m# Initialize automatically with flags\x1b[0m
  $ \x1b[1mcreduent init\x1b[0m --agent agent://myorg/mybot --domain myorg.com -y

  \x1b[90m# Resolve an agent's record\x1b[0m
  $ \x1b[1mcreduent resolve\x1b[0m agent://creduent/reconbot

  \x1b[90m# Verify agent trust level\x1b[0m
  $ \x1b[1mcreduent verify\x1b[0m agent://creduent/reconbot

  \x1b[90m# Register an agent\x1b[0m
  $ \x1b[1mcreduent register\x1b[0m --agent agent://myorg/mybot --domain myorg.com --json-url https://myorg.com/agent.json
  `);
}

function parseFlags(args: string[]) {
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
        console.error(`\x1b[1m\x1b[31m❌ Error: ${privateKeyPath} already exists. Aborting to prevent overwriting existing keys. Use --force to override.\x1b[0m`);
        process.exit(1);
      }
      if (existsSync(agentJsonPath)) {
        console.error(`\x1b[1m\x1b[31m❌ Error: ${agentJsonPath} already exists. Aborting to prevent overwriting metadata. Use --force to override.\x1b[0m`);
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
      ? capabilitiesStr.split(",").map(c => c.trim()).filter(Boolean)
      : [];

    console.log(`\n\x1b[36m🔑 Generating Ed25519 key pair...\x1b[0m`);
    const { privateKeyPem, publicKeyStr } = generateKeys();

    const draftDoc = {
      version: "1.0",
      agent_id: agent,
      owner,
      public_key: publicKeyStr,
      endpoint,
      capabilities
    };

    console.log(`\x1b[36m✍️  Signing agent.json metadata...\x1b[0m`);
    const signedDoc = signDocument(draftDoc, privateKeyPem);

    try {
      await fs.writeFile(privateKeyPath, privateKeyPem, "utf-8");
      console.log(`\x1b[1m\x1b[32m✅ Private key saved to:\x1b[0m ${privateKeyPath} \x1b[90m(KEEP THIS SECRET!)\x1b[0m`);

      await fs.writeFile(agentJsonPath, JSON.stringify(signedDoc, null, 2), "utf-8");
      console.log(`\x1b[1m\x1b[32m✅ Signed agent.json saved to:\x1b[0m ${agentJsonPath}\n`);

      console.log(`\x1b[1m\x1b[33mYOUR PUBLIC KEY:\x1b[0m`);
      console.log(`  \x1b[36m${publicKeyStr}\x1b[0m\n`);

      console.log(`\x1b[1m\x1b[32m🚀 Setup completed successfully!\x1b[0m`);
      console.log(`To publish and verify this identity:`);
      console.log(`  1. Host \x1b[1magent.json\x1b[0m at: \x1b[4mhttps://${domain}/.well-known/agent.json\x1b[0m`);
      console.log(`  2. Add a DNS TXT record for \x1b[1m_creduent.${domain}\x1b[0m containing: \x1b[36m${agent}\x1b[0m`);
      console.log(`  3. Register your agent:`);
      console.log(`     \x1b[1mcreduent register --agent ${agent} --domain ${domain} --json-url https://${domain}/.well-known/agent.json\x1b[0m\n`);
    } catch (err) {
      console.error(`\x1b[1m\x1b[31m❌ Error writing files:\x1b[0m ${err}`);
      process.exit(1);
    }
  }

  // ── resolve ──────────────────────────────────────────────────────────────
  else if (command === "resolve") {
    const uri = args[1];
    if (!uri) {
      console.error("\x1b[1m\x1b[31m❌ Error: Please provide an agent URI.\x1b[0m\n\x1b[90m   Usage: creduent resolve agent://domain/name\x1b[0m");
      process.exit(1);
    }
    try {
      console.log(`\n\x1b[36m🔍 Resolving:\x1b[0m \x1b[1m${uri}\x1b[0m`);
      const record = await resolveAgent(uri, clientOptions);
      printRecord(record);
    } catch (err) {
      if (err instanceof AgentNotFoundError) {
        console.error(`\x1b[1m\x1b[31m❌ Agent not found:\x1b[0m ${uri}`);
      } else if (err instanceof CreduentError) {
        console.error(`\x1b[1m\x1b[31m❌ Registry error:\x1b[0m ${err.message}`);
      } else {
        console.error(`\x1b[1m\x1b[31m❌ Unexpected error:\x1b[0m ${err}`);
      }
      process.exit(1);
    }
  }

  // ── verify ───────────────────────────────────────────────────────────────
  else if (command === "verify") {
    const uri = args[1];
    if (!uri) {
      console.error("\x1b[1m\x1b[31m❌ Error: Please provide an agent URI.\x1b[0m\n\x1b[90m   Usage: creduent verify agent://domain/name\x1b[0m");
      process.exit(1);
    }
    try {
      console.log(`\n\x1b[36m🔐 Verifying:\x1b[0m \x1b[1m${uri}\x1b[0m`);
      const verified = await verifyAgent(uri, clientOptions);
      if (verified) {
        console.log(`\x1b[1m\x1b[32m✅ Agent is VERIFIED and trusted.\x1b[0m\n`);
      } else {
        console.log(`\x1b[1m\x1b[33m⚠️  Agent is NOT verified or not registered.\x1b[0m\n`);
        process.exit(1);
      }
    } catch (err) {
      if (err instanceof CreduentError) {
        console.error(`\x1b[1m\x1b[31m❌ Registry error:\x1b[0m ${err.message}`);
      } else {
        console.error(`\x1b[1m\x1b[31m❌ Unexpected error:\x1b[0m ${err}`);
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
      console.error("\x1b[1m\x1b[31m❌ Error: Missing required flags.\x1b[0m");
      console.error("\x1b[90m   Usage: creduent register --agent <uri> --domain <domain> --json-url <url>\x1b[0m");
      process.exit(1);
    }

    try {
      console.log(`\n\x1b[36m📝 Registering agent:\x1b[0m \x1b[1m${agent}\x1b[0m`);
      const record = await registerAgent(
        { agent_id: agent, domain, agent_json_url: jsonUrl, metadata: meta },
        clientOptions
      );
      console.log("\x1b[1m\x1b[32m✅ Agent registered successfully!\x1b[0m");
      printRecord(record);
    } catch (err) {
      if (err instanceof CreduentError) {
        console.error(`\x1b[1m\x1b[31m❌ Registry error:\x1b[0m ${err.message}`);
      } else {
        console.error(`\x1b[1m\x1b[31m❌ Unexpected error:\x1b[0m ${err}`);
      }
      process.exit(1);
    }
  }

  // ── unknown ──────────────────────────────────────────────────────────────
  else {
    console.error(`\x1b[1m\x1b[31m❌ Unknown command:\x1b[0m "${command}"`);
    printHelp();
    process.exit(1);
  }
}

main();

