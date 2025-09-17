# Repository Guidelines

This guide explains how to structure, build, test, and contribute changes to this repository. Keep changes small, documented, and covered by tests.

## Project Structure & Module Organization
- `src/`: application code grouped by feature (e.g., `src/auth/`, `src/api/`).
- `tests/`: unit/integration tests mirroring `src/` paths.
- `scripts/`: development and CI helpers.
- `docs/`: design notes and architecture decisions.
- `assets/`: static files and fixtures.
- `.github/`: workflows and templates.

## Build, Test, and Development Commands
- Preferred via Make (if present):
  - `make setup`: install deps, set up hooks.
  - `make build`: compile/type-check.
  - `make test`: run tests with coverage.
  - `make lint`: format and lint (auto-fixes where possible).
- Language-specific alternatives:
  - Node: `npm ci`, `npm run build`, `npm test`, `npm run dev`.
  - Python: create venv, `pip install -r requirements.txt`, `pytest -q`, `ruff format && ruff check --fix`.
  - Go/Rust: `go build && go test ./...` or `cargo build && cargo test`.

## Coding Style & Naming Conventions
- Formatting: use auto-formatters (Prettier, Black, gofmt, rustfmt). Commit only formatted code.
- Indentation: 2 spaces (JS/TS), 4 spaces (Python).
- Naming: `camelCase` (vars/functions JS/TS), `snake_case` (Python), `PascalCase` (types/classes). Prefer `kebab-case` for CLI and file names where idiomatic.
- Structure: tests mirror source; one module per concern; keep functions small and pure.

## Testing Guidelines
- Frameworks: `pytest` (Python) or `jest/vitest` (JS/TS) depending on stack.
- Test files: `tests/<path>/` with names like `*_test.py`, `*.spec.ts`, `*_test.go`.
- Coverage: target ≥ 80%. Generate reports via `make test` or `npm test -- --coverage`.
- Mark slow/integration tests; keep unit tests fast and deterministic.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat: add auth middleware`, `fix: handle 401s`).
- PRs: include a clear description, linked issues (`Closes #123`), screenshots for UI, and reproduction/verification steps.
- Checks: ensure CI, lint, and tests pass before requesting review.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (gitignored) and provide `.env.example`.
- Document required env vars in `README.md` or `docs/config.md`.
- Validate inputs at boundaries; avoid dynamic `eval`/`exec`.

## Agent-Specific Instructions
- Keep scope tight; update docs/tests alongside code.
- When refactoring, propose a brief plan in the PR description and migrate in small steps.

