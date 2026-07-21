# Contributing to Creduent CLI

Thank you for your interest in contributing to the Creduent CLI! This guide helps you set up your local development environment and details our contribution guidelines.

---

## Development Setup

1. **Clone the Repository:**

    ```bash
    git clone https://github.com/idevsec/creduent-cli.git
    cd creduent-cli
    ```

2. **Install Dependencies:**

    ```bash
    npm install
    ```

3. **Run the Compiler in Watch Mode:**
   To automatically compile TypeScript changes during development:

    ```bash
    npm run build -- --watch
    ```

4. **Verify Installation Locally:**
   You can run the compiled CLI locally using Node:

    ```bash
    node dist/cli.js --help
    ```

5. **Run the Test Suite:**
   Verify your setup by running the native Node.js tests:
    ```bash
    npm run test
    ```

---

## Code Guidelines & Robustness Guarantees

Please ensure all contributions align with our core protocol security guarantees:

- **Ed25519 Checking:** Maintain local decentralized signature validation using `globalThis.crypto.subtle` (Web Crypto API) in core verify commands.
- **Canonicalization:** Ensure all payloads are serialized using RFC 8785 JSON Canonicalization Scheme (JCS) before signing or verifying.
- **Error Resilience:** Catch and format HTTP and filesystem exceptions cleanly, failing closed on signature mismatches.

---

## Git Workflow & Branching Strategy

To keep the repository clean and manageable, please follow our branching conventions:

### Branch Naming Conventions

- **Features:** Use prefix `feature/` (e.g., `feature/custom-resolver-support`) for new CLI commands or options.
- **Bugfixes:** Use prefix `bugfix/` (e.g., `bugfix/crlf-signing-issue`) for fixing bugs or issues.
- **Documentation:** Use prefix `docs/` (e.g., `docs/command-reference-update`) for changes to documentation or README files.
- **Refactoring:** Use prefix `refactor/` (e.g., `refactor/typescript-migration`) for code refactors with no functional changes.

### Pull Request Process

1. Create a local branch from the `main` branch following the naming conventions above.
2. Make changes and verify them locally. Ensure code formatting is clean.
3. Push your branch to GitHub.
4. Open a Pull Request (PR) against the `main` branch.
5. Fill out the Pull Request template completely.
6. Ensure any checks (CI workflows) pass and request review from maintainers.

---

## Project Roadmap & Wanted Features

The Creduent CLI follows the global [Creduent Protocol Roadmap](https://github.com/idevsec/creduent/blob/main/ROADMAP.md). If you are looking for specific ways to contribute to the CLI, please refer to our active hotspots below:

### CLI Active Hotspots
* **Output Formatting (Phase 4):** Add `--format json` and `--format table` options to formatting-heavy commands like `creduent discover` and `creduent resolve` to make CLI output easily scriptable/readable.
* **Shell Autocomplete (Phase 4):** Write autocomplete generator scripts for bash, zsh, and powershell.
* **Interactive Sign Wizard (Phase 4):** Implement an interactive prompt utility for `creduent init` and signing flows to reduce parameter entry friction for beginners.

Before opening a Pull Request for a new feature, please open an Issue to align on the specification and design.

