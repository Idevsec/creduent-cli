# Creduent CLI

[![npm version](https://img.shields.io/npm/v/@idevsec/creduent-cli.svg?color=blue)](https://www.npmjs.com/package/@idevsec/creduent-cli)
[![License](https://img.shields.io/github/license/idevsec/creduent-cli.svg)](https://github.com/idevsec/creduent-cli/blob/main/LICENSE)
[![Node Compatibility](https://img.shields.io/node/v/@idevsec/creduent-cli.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/@idevsec/creduent-cli.svg)](https://www.npmjs.com/package/@idevsec/creduent-cli)

The official command-line interface for the **[Creduent Protocol](https://idevsec.com/creduent)** — the open standard for cryptographic AI agent identity, Ed25519 signing, DNS ownership verification, and attestation registry.

The Creduent CLI allows developers, operators, and agent hosts to resolve attestation records, verify agent trust status, and register new agent identities directly from the terminal.

> **Protocol**: [idevsec.com/creduent](https://idevsec.com/creduent) | **Docs**: [idevsec.com/creduent/docs](https://idevsec.com/creduent/docs) | **Registry**: [registry.idevsec.com](https://registry.idevsec.com)

---

## Key Features

- **Command-Line Native**: Lightweight and fast terminal utility optimized for scripts, pipelines, and DevOps workflows.
- **Full Registry Integration**: Seamlessly register new agents, resolve identity records, and perform cryptographic signature validation.
- **Custom Registry Selection**: Target private or custom local registry instances using the `--base-url` parameter.
- **No Complex Configuration**: Simply install and run, no local database setup required.

---

## Installation

Install the CLI tool globally via npm:

```bash
npm install -g @idevsec/creduent-cli
```

Once installed, you can access the CLI using the `creduent` command.

---

## Command Reference & Examples

### 1. Resolve an Agent Attestation
Fetches and displays the complete cryptographic attestation record of a registered agent by its canonical `agent://` URI.

```bash
creduent resolve agent://creduent/reconbot
```

**Example Output:**
```text
Resolving: agent://creduent/reconbot

Agent Record:
  Agent ID   : agent://creduent/reconbot
  Issuer     : agent://creduent/registry
  Level      : trusted
  Domain     : registry.idevsec.com
  Public Key : ed25519:V43yNaTrpqQj9YJnjYVL2HdOrqUDcnflhzNGuHTaFD8=
  Registered : undefined
  Issued     : 2026-05-30T19:23:30Z
  Expires    : 2027-05-30T19:23:30Z
```

---

### 2. Verify Agent Status
Queries the registry to quickly check if an agent has an active, trusted status (`verified` or `trusted`).

```bash
creduent verify agent://creduent/reconbot
```

* **If Verified**: Prints `Agent is VERIFIED and trusted.` (Exits with code `0`).
* **If Not Verified / Expired**: Prints `Agent is NOT verified or not registered.` (Exits with code `1`).

---

### 3. Register a New Agent
Registers a new AI agent identity with the Creduent registry by submitting its URI, domain, and the URL to its `agent.json` metadata document.

```bash
creduent register \
  --agent agent://myorg/mybot \
  --domain myorg.com \
  --json-url https://myorg.com/agent.json \
  --meta env=production \
  --meta version=1.0
```

---

## Global Options

You can append these global options to any command:

| Option | Description |
| :--- | :--- |
| `--base-url <url>` | Override the default public registry (`https://registry.idevsec.com`) to query a private or local registry. |
| `--help` | Show the help menu listing all commands and flags. |

**Example using a custom registry:**
```bash
creduent resolve agent://myorg/mybot --base-url http://localhost:8000
```

---

## Protocol Specification

For details on JCS canonicalization, agent cryptographic validation schemes, and the core protocol workflow:

- **Protocol overview**: [idevsec.com/creduent](https://idevsec.com/creduent)
- **Technical reference**: [idevsec.com/creduent/docs](https://idevsec.com/creduent/docs)
- **Standards documents**: [github.com/idevsec/creduent](https://github.com/idevsec/creduent) (CREDUENT-001 through CREDUENT-005)

---

## License

This CLI is dual-licensed: Apache 2.0 for open-source and non-commercial use. Commercial license required for organizations with annual revenue exceeding USD $1,000,000. See [idevsec.com/creduent/licensing](https://idevsec.com/creduent/licensing) for full details.
