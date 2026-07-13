# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [2.1.1] - 2026-07-13

### Fixed
- **Support v2.0 Schema Resolution in `verify`**: Fixed an issue where the verify command failed to extract and print `Owner` and `Capabilities` values (showing `undefined`) when resolving newer `v2.0` schema files (where these values are nested inside `.identity` and `.policy` objects).
- **Cleaned printRecord Layout**: Removed redundant `Registered: N/A` field output from the resolved attestation record table as the `Issued At` timestamp represents the actual registration date.
- **`tsconfig` overrides**: Added `"ignoreDeprecations": "6.0"` to the CommonJS target configuration to suppress TypeScript's deprecation warnings for `moduleResolution: node`.
- **package.json formatting**: Ran `npm pkg fix` to normalize repository URL formats and format binary targets.

## [2.1.0] - 2026-07-10

### Fixed
- **`renew --days` default corrected**: The default value for `--days` was `365`, but the registry enforces a hard 30-day maximum on all renewals and silently caps any longer request. The default is now `30`, matching the actual server behaviour. The help text has been updated to read `(default: 30, server enforces a 30-day maximum)` so users are not surprised by the outcome.

## [2.0.9] - 2026-07-08

### Added

- **`revoke` command:** Permanently revoke an agent's attestation via `creduent revoke --agent <uri> --key <pem>`. Signs a JCS-canonicalized payload with the agent's private key and calls `DELETE /registry/revoke/{agent_id}`. Includes a mandatory confirmation prompt (bypassed with `-y`) and an optional `--reason` flag.
- **`revokeAgent()` client function:** Added `revokeAgent(payload, options)` to `client.ts` supporting the `DELETE` HTTP method on the registry revoke endpoint.

### Changed

- **Dependency bump:** Updated `@idevsec/creduent` from `^2.0.3` to `^2.0.5` to align with current SDK release.

## [2.0.8] - 2026-07-05

### Changed

- **Documentation & Tests:** Replaced the legacy test agent (`agent://creduent/reconbot`) with the official standard agent (`agent://idevsec/steward`) across all code snippets, examples, and CLI help text to ensure consistency with production environments.
- **CLI References:** Purged internal testing stubs from CLI usage output.

## [2.0.7] - 2026-07-04

### Fixed

- **NPM Lockfile Registry Resolvers:** Replaced relative local directory links (`../../creduent-js`) in `package-lock.json` with direct public registry pointers to ensure builds run successfully in standard VM environments.
- **TypeScript 6 Compatibility:** Configured explicit `"types": ["node"]` compiler definitions in `tsconfig.json` to resolve Node.js glob import warnings.
- **Workflow Build Steps:** Enabled `--legacy-peer-deps` to bypass strict local package locks in CI runners.

### Added

- **Community Standards & Styling:** Integrated `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`, `.prettierrc`, and `.pre-commit-config.yaml`.
- **CI Workflows:** Added automated Prettier styling checks and publication actions.

## [2.0.6] - 2026-06-29

### Changed

- Maintenance update bump.

## [2.0.5] - 2026-06-28

### Removed

- **Self-dependency:** Removed `@idevsec/creduent-cli` from package dependencies.

### Changed

- **Professional CLI Output:** Removed all decorative emojis from CLI commands to present a cleaner, enterprise-ready terminal experience.

## [2.0.4] - 2026-06-28

### Changed

- Maintenance release with minor internal fixes.

## [2.0.3] - 2026-06-27

### Changed

- **Unified Domain Name Migration:** Standardized default registry URL on `creduent.idevsec.com` across CLI command arguments and documentation.

## [2.0.2] - 2026-06-27

### Added

- **Unit Test Suites:** Added three native `node --test` suites (`test/client.test.ts`, `test/crypto.test.ts`, `test/utils.test.ts`) validating key generation, signing, parsing, and CLI flag handling.
- **IDE Configuration:** Added `test/tsconfig.json` to enable type safety checking and resolve editor warnings for tests without polluting production configurations.

### Fixed

- **Insecure Key Permissions:** Enforced strict `0o600` permissions on written private key PEM files in `cli.ts` to prevent local credential exposure.
- **Test Mode Process Exit:** Modified CLI entrypoint check to prevent top-level execution runner from invoking process exit during module import in unit test environments.

## [2.0.1] - 2026-06-27

### Fixed

- **Fetch Timeout:** Added `AbortController`-based 10-second timeout to all registry `fetch()` calls in `client.ts`, preventing CLI from hanging indefinitely when the registry is slow or unreachable.
- **Dynamic Version String:** Replaced hardcoded `"0.1.4"` version in the help banner with a dynamic read from `package.json`, ensuring `--help` always shows the correct version.

### Changed

- **SDK Dependency Bump:** Updated `@idevsec/creduent` dependency from `^0.1.4` to `^2.0.1` to unlock v2.0 schema support, multisig attestation, and DNS recovery features.
- **Single License Alignment:** Transitioned package metadata to sole coverage under the Apache License 2.0.

## [0.1.2] - 2026-06-13

### Changed

- Migrated default registry URL from `api.idevsec.com` to `creduent.idevsec.com`.

## [0.1.1] - 2026-06-08

### Changed

- Standardized git ignores.
- Re-packaged distribution package.

## [0.1.0] - 2026-06-02

### Added

- Initial release: CLI agent tools for registry registration, DNS verification, and attestation management.
