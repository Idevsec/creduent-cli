# Creduent CLI

[![npm version](https://img.shields.io/npm/v/@idevsec/creduent-cli.svg?color=blue)](https://www.npmjs.com/package/@idevsec/creduent-cli)
[![License](https://img.shields.io/github/license/idevsec/creduent-cli.svg)](https://github.com/idevsec/creduent-cli/blob/main/LICENSE)
[![Node Compatibility](https://img.shields.io/node/v/@idevsec/creduent-cli.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/@idevsec/creduent-cli.svg)](https://www.npmjs.com/package/@idevsec/creduent-cli)

The official command-line interface for the **[Creduent Protocol](https://idevsec.com/creduent)**, the open standard for cryptographic AI agent identity, Ed25519 signing, DNS ownership verification, and attestation registry.

### What is Creduent?

**Creduent** is an open application-layer protocol for cryptographic identity and trust verification of autonomous AI agents, originally created by Kashish Kanojia and stewarded by IDevSec. The official Creduent CLI is developed and maintained by IDevSec.

The Creduent CLI allows developers, operators, and agent hosts to initialize agent identities, resolve attestation records, cryptographically verify agent trust status, and register new agents directly from the terminal.

> **Protocol**: [idevsec.com/creduent](https://idevsec.com/creduent) | **Docs**: [idevsec.com/creduent/docs](https://idevsec.com/creduent/docs) | **Registry**: [creduent.idevsec.com](https://creduent.idevsec.com)

---

## Key Features

- **Native Cryptographic Verification**: The `verify` command uses the `@idevsec/creduent` SDK to validate Ed25519 signatures locally. No centralized API trust is required.
- **Command-Line Native**: Lightweight and fast terminal utility optimized for scripts, pipelines, and DevOps workflows.
- **Full Registry Integration**: Seamlessly register new agents, resolve identity records, and perform cryptographic signature validation.
- **Custom Registry Selection**: Target private or custom local registry instances using the `--base-url` parameter.
- **No Complex Configuration**: Simply install and run, no local database setup required.

---

## Installation

```bash
npm install -g @idevsec/creduent-cli
```

Once installed, you can access the CLI using the `creduent` command.

---

## Command Reference & Examples

### 1. Initialize a New Agent Identity

Generates a fresh Ed25519 keypair, builds a signed `agent.json` document, and saves both to disk.

```bash
# Interactive setup
creduent init

# Non-interactive with flags
creduent init \
  --agent agent://myorg/mybot \
  --owner "My Organization" \
  --domain myorg.com \
  --endpoint https://api.myorg.com/agent \
  --capabilities "chat,search" \
  -y
```

**Example Output:**

```text
Generating Ed25519 key pair...
Signing agent.json metadata...
Private key saved to: private_key.pem (KEEP THIS SECRET!)
Signed agent.json saved to: agent.json

YOUR PUBLIC KEY:
  ed25519:V43yNaTrpqQj9YJnjYVL2HdOrqUDcnflhzNGuHTaFD8=

Setup completed successfully!
To publish and verify this identity:
  1. Host agent.json at: https://myorg.com/.well-known/agent.json
  2. Add a DNS TXT record for _creduent.myorg.com
  3. Register your agent: creduent register --agent agent://myorg/mybot ...
```

---

### 2. Verify an Agent (Native Cryptographic)

Downloads the agent identity document and validates the Ed25519 signature locally using the `@idevsec/creduent` SDK. No centralized trust, as verification is fully decentralized.

```bash
creduent verify agent://idevsec/steward
```

**Example Output (verified):**

```text
Cryptographically VERIFIED!
Agent ID:     agent://idevsec/steward
Owner:        IDevSec
Capabilities: verify, resolve, attest
```

**Example Output (failed):**

```text
Verification failed: Signature verification failed
```

---

### 3. Resolve an Agent Attestation

Fetches and displays the complete cryptographic attestation record of a registered agent from the registry.

```bash
creduent resolve agent://idevsec/steward
```

**Example Output:**

```text
Resolving: agent://idevsec/steward

  Agent ID   : agent://idevsec/steward
  Issuer     : agent://creduent/registry
  Level      : trusted
  Domain     : creduent.idevsec.com
  Public Key : ed25519:V43yNaTrpqQj9YJnjYVL2HdOrqUDcnflhzNGuHTaFD8=
  Issued     : 2026-05-30T19:23:30Z
  Expires    : 2027-05-30T19:23:30Z
```

---

### 4. Register a New Agent

Registers a new AI agent identity with the Creduent registry by submitting its URI, domain, and the URL to its `agent.json` metadata document.

```bash
creduent register \
  --agent agent://myorg/mybot \
  --domain myorg.com \
  --json-url https://myorg.com/.well-known/agent.json \
  --meta env=production \
  --meta version=1.0
```

---

### 5. Renew Agent Attestation

Extends your agent's attestation validity period. Requires the agent's private key to sign the renewal request. The registry enforces a 30-day maximum — any request beyond 30 days from now is capped server-side.

```bash
# Renew for 30 days (default)
creduent renew --agent agent://myorg/mybot

# Renew for a specific number of days (max 30 enforced by server)
creduent renew \
  --agent agent://myorg/mybot \
  --days 14 \
  --key ./private_key.pem
```

| Flag | Default | Description |
| :--- | :--- | :--- |
| `--agent` | required | Agent URI to renew |
| `--days` | `30` | Days from now for new expiry (server max: 30) |
| `--key` | `./private_key.pem` | Path to the agent's private key PEM file |

---



## Global Options

| Option             | Description                                                                                                 |
| :----------------- | :---------------------------------------------------------------------------------------------------------- |
| `--base-url <url>` | Override the default public registry (`https://creduent.idevsec.com`) to query a private or local registry. |
| `--help`           | Show the help menu listing all commands and flags.                                                          |

**Example using a custom registry:**

```bash
creduent verify agent://myorg/mybot --base-url http://localhost:8000
```

---

## How Verification Works

Starting from Phase 3, `creduent verify` performs fully decentralized cryptographic verification:

1. Resolves the `agent://` URI to the agent's published `agent.json` document.
2. Strips the `signature` field and applies RFC 8785 JCS canonicalization.
3. Verifies the Ed25519 signature against the document's declared public key using `globalThis.crypto.subtle` (Web Crypto API).
4. Returns the verified agent ID and capabilities on success.

This means verification works entirely offline once the document is fetched, and does not depend on the registry being live or trusted.

---

## Development & Testing

The Creduent CLI contains unit tests checking argument flag parsing, crypto operations, and client routines. Tests are built on top of Node.js's native test runner.

To compile and execute the test suites:

```bash
npm run test
```

---

## Protocol Specification

- **Protocol overview**: [idevsec.com/creduent](https://idevsec.com/creduent)
- **Technical reference**: [idevsec.com/creduent/docs](https://idevsec.com/creduent/docs)
- **JS SDK**: [github.com/idevsec/creduent-js](https://github.com/idevsec/creduent-js)
- **Standards documents**: [github.com/idevsec/creduent](https://github.com/idevsec/creduent) (CREDUENT-001 through CREDUENT-007)

---

## License

Licensed under the **[Apache License 2.0](LICENSE)**. See the [LICENSE](LICENSE) file for the full legal text.
