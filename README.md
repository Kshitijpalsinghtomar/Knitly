# Ariadne x Knitly — first end-to-end slice

This repo is the Knitly frontend (React 19 + Vite 8 + Tailwind v4, pnpm) adapted to run a real
(but deterministic, zero-secret) Ariadne slice: **paste-ingest → persist → deterministic BRD
generation → trace rendering → completion gating**.

The original rich mock data/UI is preserved as demo content; the real generated path is added
alongside it (when a BRD is generated it renders in the Document view as a "LIVE · GENERATED"
document).

## Run it

Requires [Bun](https://bun.sh) (for the server) and pnpm.

```sh
pnpm install          # or: pnpm install --store-dir <dir> if your home fs is small
pnpm build            # builds the Vite frontend into dist/
pnpm start            # runs the Bun server on 0.0.0.0:3000 (override PORT for testing)
```

Open http://localhost:3000 → Workspace → **Generate with Trace** → pick BRD → brief → paste a
transcript (or use the sample) → Generate. You land on the live generated BRD.

## What was added

- **Real ingest surface** — `src/components/DocGenModal.tsx` now has a source-title field and a
  transcript textarea (replacing the mock "choose sources" step). Pasted text is captured as a
  `Source` record.
- **Server-side persistence contract** — `src/server/db.ts` mirrors the team's shared-site Neon
  helper: lazy `process.env.DATABASE_URL`, in-memory fallback when unset, clear "database not
  configured" state in the UI (`src/App.tsx` banner). `server/index.ts` (Bun) serves `dist/` and
  the API: `POST /api/sources`, `POST /api/brd/generate`, `GET /api/health`.
- **Deterministic BRD generator behind a model-adapter contract** — `src/server/generator.ts`
  defines `BrdGenerator` (with `generateBRD(source) => BRD`), implemented by
  `RuleBasedBrdGenerator`: splits transcript sentences into requirements with inferred
  author/timestamp and source quote, and flags candidate conflicts by shared-topic +
  contradiction heuristics. `defaultBrdGenerator` is the server default.
- **Real generated BRD rendering** — `src/views/DocumentView.tsx` renders the live BRD (source
  quote → requirement → author/timestamp trace, conflicts with resolve) and `RequirementView.tsx`
  renders a real requirement's source-quote chain.
- **Completion gating** — `computeCompleteness()`: a BRD is complete only if every requirement is
  traced AND no conflicts are unresolved. PRD generation in the modal is disabled until the live
  BRD is complete.

## Types

New shared types live in `src/types/index.ts`: `Source`, `GeneratedRequirement`, `SourceConflict`,
`BRD`, `ServerStatus`.

## Model-adapter contract & what plugs in later

- **Real AI adapter**: implement `BrdGenerator` (e.g. `AiBrdGenerator` calling a model API),
  returning the same `BRD` + `GeneratedRequirement` shape so source-quote traceability is
  preserved. Swap `defaultBrdGenerator` in `server/index.ts`.
- **Database**: set `DATABASE_URL` (Neon). `src/server/db.ts` already persists `source` and `brd`
  records to Postgres (`sources`, `brds` tables) and reports `mode: 'db'`.
- **Also later**: live source sync, upload parsing, and the full PRD renderer (PRD currently gates
  on BRD completeness but is not yet generated).
