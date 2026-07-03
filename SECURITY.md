# Security Policy

We take the security of this command-line tool and the cryptographic integrity of the Creduent Protocol seriously.

---

## Supported Versions

Only the latest release of Creduent CLI is actively supported with security patches and enhancements.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0.0 | No        |

---

## Security Guarantees & Verification Integrity

Creduent CLI implements strict safety and cryptographic validation measures:

- **Decentralized Verification:** The `verify` command performs signature checking locally on your machine using built-in, secure system libraries, rather than trusting a remote server's assertion.
- **Safe Private Keys handling:** When invoking `creduent init`, the generated private key is saved with secure local file permissions and automatically recommended for exclusion from version control.

---

## Reporting a Vulnerability

If you discover a security vulnerability within the Creduent CLI (e.g., local signature bypasses, insecure key storage, or remote code execution risks), please report it responsibly:

1. Do NOT open a public GitHub issue detailing the vulnerability.
2. Email your findings and a proof-of-concept (PoC) directly to the maintainers or security contacts at `security@idevsec.com`.
3. Allow the maintainers time to analyze, reproduce, and release a patch before disclosing details publicly.
