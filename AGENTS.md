# Repository Guidelines

## Project Structure & Module Organization
The repo is an npm workspace with two packages: `apps/web` (React + Vite client) and `apps/server` (Express + Socket.IO API). Each app keeps implementation under `src/`, builds into `dist/`, and inherits settings from `tsconfig.base.json`. Place shared knowledge in `docs/ssbb-planning.md` and keep quick experiments inside the tiny root `index.js`, not in the packages.

## Build, Test, and Development Commands
- `npm run dev` – Runs Vite and the tsx-powered server watcher side by side.
- `npm run build` – Compiles both apps for production output.
- `npm run lint` – Executes ESLint across web and server.
- `npm --workspace apps/web run preview` or `npm --workspace apps/server run start` – Smoke-test the built artifacts individually.

## Coding Style & Naming Conventions
Write everything in TypeScript, prefer explicit return types on exported APIs, and stick to 2-space indentation with single quotes as enforced by ESLint. React components, Zustand stores, and server controllers use `PascalCase`, while hooks follow `useCamelCase` and utilities stay in `kebab-case.ts`. Keep schema files suffixed `.schema.ts`, Socket.IO namespaces grouped under `apps/server/src/sockets/`, and always run `npm run lint` before committing.

## Testing Guidelines
No automated suite ships yet, so create tests whenever you touch a module. Front-end specs should live next to the code as `Component.test.tsx` (Vitest + React Testing Library is the preferred stack); server specs should use Vitest + supertest in `*.test.ts`. Aim for roughly 80% statement coverage on touched files and describe any manual QA (browsers, API calls, devices) directly in the PR.

## Commit & Pull Request Guidelines
Use Conventional Commits syntax such as `feat(chat): enable pinning`, one feature per commit. Every PR needs a short summary, linked issue or doc section, screenshots or JSON diffs when outputs change, and a verification list (tests run, manual steps). Cross-surface work must ping both a web and server reviewer to keep context synchronized.

## Security & Configuration Tips
Keep credentials in `.env` files loaded through `dotenv` and reference them via `process.env.MY_KEY`; never hard-code AWS bucket names or Socket secrets. Document any new env var in the PR body and scrub console output before committing to avoid leaking user content. After dependency changes, run `npm audit` and record notable findings in `docs/ssbb-planning.md` if remediation is deferred.
