/**
 * Ariadne production server (Bun).
 *
 * Serves the built Knitly frontend (from `dist/`) AND the real backend slice:
 *   - `POST /api/sources`      persist an ingested source (Neon via DATABASE_URL,
 *                              falling back to an in-memory store when unset)
 *   - `POST /api/brd/generate` run the deterministic rule-based BRD generator
 *   - `GET  /api/health`       report runtime status (db/memory/offline)
 *
 * Run: `pnpm build && pnpm start`  (serves on 0.0.0.0:3000 by default).
 * Override the bound port with `PORT` (for local testing).
 *
 * The generator behind `/api/brd/generate` is the `BrdGenerator` contract in
 * `src/server/generator.ts`. It is currently `RuleBasedBrdGenerator` (no AI key
 * required). A real model adapter implements the same interface and plugs in
 * here later.
 */
import { defaultBrdGenerator, computeCompleteness } from '../src/server/generator'
import { createSource, getSource, saveBRD, ensureSchema, dbConfigured } from '../src/server/db'
import type { BRD, ServerStatus, Source } from '../src/types'

const PORT = Number(process.env.PORT || 3000)
const HOST = '0.0.0.0'
const DIST = `${import.meta.dir}/../dist`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

const statusOf = (): ServerStatus =>
  dbConfigured()
    ? { ok: true, dbConfigured: true, mode: 'db', detail: 'Persisting to Neon via DATABASE_URL.' }
    : { ok: true, dbConfigured: false, mode: 'memory', detail: 'DATABASE_URL not set — using in-memory storage.' }

async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return json({ ...statusOf(), generator: 'rule-based' })
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
    const { source } = await createSource({ title: title || 'Untitled', rawText, author })
    return json({ source, ...statusOf() }, 201)
  }

  if (url.pathname === '/api/brd/generate' && req.method === 'POST') {
    let body: { sourceId?: string; source?: Source }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    let source: Source | null = body.source ?? null
    if (!source && body.sourceId) source = await getSource(body.sourceId)
    if (!source) return json({ error: 'A source is required (pass `source` or a persisted `sourceId`).' }, 400)

    const brd = (await defaultBrdGenerator.generateBRD(source)) as BRD
    brd.complete = computeCompleteness(brd)
    await saveBRD(brd)
    return json({ brd, ...statusOf() }, 200)
  }

  return json({ error: 'Not found' }, 404)
}

// Startup: ensure schema silently (only matters when a DB is configured).
ensureSchema().catch(() => {})

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
console.log(`Persistence: ${dbConfigured() ? 'Neon (DATABASE_URL)' : 'in-memory (set DATABASE_URL for durable storage)'}`)
