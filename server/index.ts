/**
 * Ariadne production server (Bun).
 *
 * Serves the built Knitly frontend (from `dist/`) AND the real backend slice:
 *   - `POST /api/sources`      persist an ingested source (Neon via DATABASE_URL,
 *                              falling back to an in-memory store when unset)
 *   - `POST /api/brd/generate` run the deterministic rule-based BRD generator
 *   - `GET  /api/health`       report runtime status (db/memory/offline) with a
 *                              REAL connectivity probe — see DbHealth below
 *
 * Run: `pnpm build && pnpm start`  (serves on 0.0.0.0:3000 by default).
 * Override the bound port with `PORT` (for local testing).
 *
 * The generator behind `/api/brd/generate` is the `BrdGenerator` contract in
 * `src/server/generator.ts`. It is currently `RuleBasedBrdGenerator` (no AI key
 * required). A real model adapter implements the same interface and plugs in
 * here later.
 *
 * Startup is deterministic: schema initialization (CREATE TABLE IF NOT EXISTS)
 * is AWAITED before the server accepts requests, so the first DB-backed write
 * can never race table creation. If schema init fails because the database is
 * unreachable, the server still starts, but `/api/health` reports `ok: false`
 * with db.ready=false and DB-backed writes return a clean 503 (persistence
 * errors are observable, never silently swallowed).
 */
import { defaultBrdGenerator, computeCompleteness } from '../src/server/generator'
import {
  createSource,
  getSource,
  saveBRD,
  ensureSchema,
  dbConfigured,
  checkDbReachable,
} from '../src/server/db'
import type { BRD, ServerStatus, Source, DbHealth } from '../src/types'

const PORT = Number(process.env.PORT || 3000)
const HOST = '0.0.0.0'
const DIST = `${import.meta.dir}/../dist`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

// ─── Startup schema readiness ────────────────────────────────────────────────
// Populated once, before the server starts. `ready` is true in memory mode
// (there is no schema to create) and, in db mode, only after ensureSchema
// has resolved. This makes the first request deterministic: writes cannot race
// CREATE TABLE because the server does not start serving until it has run.
let startupDb: DbHealth = {
  ready: true,
  reachable: true,
  detail: 'Memory mode — no database configured.',
}

/** Live health, reflecting both startup schema state and a fresh SELECT 1. */
async function healthStatus(): Promise<ServerStatus> {
  if (!dbConfigured()) {
    return {
      ok: true,
      dbConfigured: false,
      mode: 'memory',
      detail: 'DATABASE_URL not set — using in-memory storage.',
    }
  }
  const live = await checkDbReachable()
  const db: DbHealth = {
    ready: startupDb.ready,
    reachable: live.ok,
    detail: live.ok
      ? `Database reachable (SELECT 1 ok). Schema ${startupDb.ready ? 'ready' : 'init failed — restart required.'}`
      : 'Database configured but unreachable — writes will fail until connectivity is restored.',
  }
  const ok = startupDb.ready && live.ok
  return {
    ok,
    dbConfigured: true,
    mode: 'db',
    db,
    detail: ok
      ? 'Persisting to Neon via DATABASE_URL — schema ready and reachable.'
      : `Database configured but ${!startupDb.ready ? 'schema init failed' : 'unreachable'}. Write endpoints return 503 until this is resolved.`,
  }
}

/** Wrap a DB-backed write so persistence failures surface as a clean 503. */
async function dbWrites<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await fn() }
  } catch {
    return { ok: false }
  }
}

async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return json({ ...(await healthStatus()), generator: 'rule-based' })
  }

  if (url.pathname === '/api/sources' && req.method === 'POST') {
    let body: { title?: string; rawText?: string; author?: string }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    const title = (body.title || '').trim()
    const rawText = (body.rawText || '').trim()
    const author = (body.author || '').trim() || 'Current user'
    if (!rawText) return json({ error: 'rawText is required — paste a transcript or note.' }, 400)

    const written = await dbWrites(() => createSource({ title: title || 'Untitled', rawText, author }))
    if (!written.ok) return json({ error: 'Database unavailable — could not persist source.', db: await healthStatus() }, 503)
    return json({ source: written.value.source, ...(await healthStatus()) }, 201)
  }

  if (url.pathname === '/api/brd/generate' && req.method === 'POST') {
    let body: { sourceId?: string; source?: Source }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    let source: Source | null = body.source ?? null
    if (!source && body.sourceId) {
      const fetched = await dbWrites(() => getSource(body.sourceId as string))
      if (!fetched.ok) return json({ error: 'Database unavailable — could not load source.', db: await healthStatus() }, 503)
      source = fetched.value
    }
    if (!source) return json({ error: 'A source is required (pass `source` or a persisted `sourceId`).' }, 400)

    const brd = (await defaultBrdGenerator.generateBRD(source)) as BRD
    brd.complete = computeCompleteness(brd)

    const saved = await dbWrites(() => saveBRD(brd))
    if (!saved.ok) return json({ error: 'Database unavailable — could not persist BRD.', db: await healthStatus() }, 503)
    return json({ brd, ...(await healthStatus()) }, 200)
  }

  return json({ error: 'Not found' }, 404)
}

// ─── Startup: initialize schema DETERMINISTICALLY before serving ─────────────
// In db mode this awaits CREATE TABLE IF NOT EXISTS so the first write cannot
// race it. On failure we record startupDb.ready=false (so /api/health reflects
// it) and keep serving in a degraded state rather than silently swallowing.
if (dbConfigured()) {
  try {
    await ensureSchema()
    startupDb = { ready: true, reachable: true, detail: 'Schema initialized on Neon via DATABASE_URL.' }
  } catch {
    startupDb = {
      ready: false,
      reachable: false,
      detail: 'Database configured but unreachable — schema init failed. Health reflects this.',
    }
  }
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) return handleApi(req)

    // Static frontend (built with `pnpm build`).
    if (!url.pathname.includes('.')) {
      // SPA fallback to index.html for `/` and client-side routes.
      const root = Bun.file(`${DIST}/index.html`)
      return root.exists().then((e) => (e ? new Response(root) : new Response('Not found', { status: 404 })))
    }
    const file = Bun.file(`${DIST}${url.pathname}`)
    return file.exists().then((e) => (e ? new Response(file) : new Response('Not found', { status: 404 })))
  },
})

console.log(`Ariadne (Knitly) serving on http://${HOST}:${PORT} — generator: rule-based`)
console.log(`Persistence: ${dbConfigured() ? `Neon (DATABASE_URL) — schema ${startupDb.ready ? 'ready' : 'init FAILED'}` : 'in-memory (set DATABASE_URL for durable storage)'}`)
