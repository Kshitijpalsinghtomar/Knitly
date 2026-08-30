# Project Agent Instructions

PROJECT: Knitly (figma-make-app)
PURPOSE: AI-native product documentation workspace. Ingest sources (transcripts, Slack, Jira, etc.), generate traceable BRDs/PRDs/specs, detect conflicts, and gate downstream document generation on completeness.
STACK: React 19, Vite 8, Tailwind CSS v4, TypeScript 5.7, Bun runtime/server, Neon PostgreSQL (with in-memory fallback), pnpm package manager.
RUN:
- Frontend dev: `pnpm dev` (Vite on PORT, default 8443)
- API dev: `pnpm dev:api` (Bun server on API_PORT, default 3000)
- Production: `pnpm build && pnpm start`
TEST: `bun test server/`
BUILD: `pnpm build`
IMPORTANT DIRECTORIES:
- `src/` — React frontend (components, views, lib, context, data)
- `server/` — Bun backend (index.ts, db.ts, generator.ts, gate.ts, tests)
- `docs/` — project documentation
- `dist/` — built frontend assets
- `.figma/` — Figma Make configuration and plugins
ARCHITECTURE RULES:
- Frontend uses Vite with `@/` alias pointing to `src/`.
- Tailwind CSS v4 is imported in `src/index.css`; no separate tailwind.config needed.
- Vite dev server proxies `/api` to the Bun backend on API_PORT.
- Backend uses a lazy `DATABASE_URL` connection with in-memory fallback when unset.
- Document generation follows a model-adapter contract (`BrdGenerator`) so real AI can be swapped in later.
- Document types and prerequisite gates are declared in `src/lib/documentTypes.ts` and enforced by `src/server/gate.ts`.
- Components should be default exports.
DO NOT MODIFY:
- Do not change the core document-type registry or gate order without explicit approval.
- Do not remove the in-memory DB fallback path.
- Do not break the Vite → Bun API proxy contract.
CONVENTIONS:
- Use double quotes for strings containing apostrophes to avoid build breaks.
- Keep JSX tags closed and braces balanced.
- Use `pnpm` for package management and `bun` for server runtime/tests.
- Format with `oxfmt` (`pnpm format`).

Agent rules: read `.aeos/NOW.md` and `.aeos/GUIDE.md` before meaningful work; inspect before modifying; reuse existing patterns; do not invent requirements; stay in scope; report evidence and uncertainty. Never mention AEOS, OpenWork, agent names, handoffs, or `.aeos/` in code comments, commit messages, docs, or other project artifacts.

> ⚠️ **REMINDER:** Ponytail is not installed for this project yet. See `.aeos/GUIDE.md` and `AEOS/TOOLS.md` for install commands. Run them once per project to add Ponytail rules files; they then work for all agents.
