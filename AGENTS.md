# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts the React + TypeScript app; domain logic lives under `src/domain`, UI widgets in `src/components`, and Electron-specific views in `src/windows`.
- `electron/` contains the main-process entry point (`electron/main`) and preload bridges; keep IPC contracts mirrored with `src/services`.
- `tests/` mirrors the architecture with `unit`, `integration`, `performance`, and Playwright-driven `e2e`; shared fixtures live in `tests/setup.ts`.
- Static assets sit in `public/`, while `docs/` and `examples/` capture reference flows and troubleshooting guides.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server at `5173` for rapid UI iteration.
- `npm run start` launches Vite and Electron together; use this when validating end-to-end flows.
- `npm run build` performs a clean TypeScript check, Vite bundle, and Electron compile into `dist/` and `dist-electron/`.
- `npm run test` runs the Jest suite; scope with `test:unit`, `test:integration`, or `test:performance` as needed.
- `npm run test:e2e` executes Playwright specs; append `--ui` locally for interactive debugging.
- `npm run typecheck` ensures both renderer and Electron projects stay type-safe before committing.

## Coding Style & Naming Conventions
- TypeScript is required; prefer explicit interfaces and keep props typed near their components.
- Follow the existing 2-space indentation, single quotes, and trailing commas where sensible.
- Name React components with `PascalCase`, hooks with `use*`, and utility modules with descriptive nouns (e.g., `debug-helper`).
- Co-locate styling in `src/styles` modules or component-scoped CSS, and avoid inline style mutations.

## Testing Guidelines
- Write unit specs alongside source modules in `tests/unit` using Jest + Testing Library.
- Cover boundary integrations (Electron IPC, streaming services) in `tests/integration` and document assumptions in the test file header.
- Use `tests/performance` for throughput regressions; capture metrics in `test-results/` when they influence releases.
- Maintain Playwright scenarios under `tests/e2e`; stub third-party APIs via the shared setup.
- New behavior should ship with at least one automated test and updated manual steps in `tests/manual` if applicable.

## Commit & Pull Request Guidelines
- Follow conventional commits (`type: summary`); recent examples include `fix:`, `refactor:`, and `docs:` prefixes.
- Keep messages in English or Japanese but stay consistent within the commit body; reference Jira/GitHub IDs when relevant.
- PRs need a concise summary, linked issues, and screenshots or logs when UI or performance changes apply.
- Verify `npm run typecheck` and the targeted test command before requesting review; note any skipped suites in the PR description.

## Environment & Configuration Tips
- Copy `.env.example` to `.env` and populate API keys locally; never commit real credentials.
- Run `npm run sync-contracts` when backend schemas change so renderer and Electron layers stay aligned.
- Capture reproducible logs in `logs/` and attach highlights to PRs rather than committing large artifacts.
