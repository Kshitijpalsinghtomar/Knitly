/**
 * Ariadne production server (Bun).
 *
 * Serves the built Knitly frontend (from `dist/`) AND the real backend slice:
 *   - `POST /api/sources`      persist an ingested source (Neon via DATABASE_URL,
 *                              falling back to an in-memory store when unset)
 *   - `GET  /api/sources`      list persisted sources (newest first)
 *   - `GET  /api/sources/:id`  load a single source by id
 *   - `POST /api/brd/generate` run the configured BRD generator (real Claude
 *                              when ANTHROPIC_API_KEY is set, else deterministic)
 *   - `GET  /api/brds`         list persisted BRDs (newest first)
 *   - `GET  /api/brds/:id`     load a single BRD by id
 *   - `PATCH /api/brds/:id/conflicts/:conflictId` persist a conflict resolution
 *                             ({ resolved: boolean }) and recompute `complete`
 *   - `GET  /api/health`       report runtime status (db/memory/offline) with a
 *                              REAL connectivity probe — see DbHealth below
 *
 * Run: `pnpm build && pnpm start`  (serves on 0.0.0.0:3000 by default).
 * Override the bound port with `PORT` (for local testing).
 *
 * The generator behind the generation endpoints is the `BrdGenerator` contract
 * in `src/server/generator.ts`, selected by `createBrdGenerator()`: a real
 * Claude adapter (`AiBrdGenerator`, src/server/ai-generator.ts) when
 * ANTHROPIC_API_KEY is set — which verifies every source quote server-side and
 * falls back to the deterministic `RuleBasedBrdGenerator` on any failure — or
 * the deterministic generator directly when no key is configured.
 *
 * Startup is deterministic: schema initialization (CREATE TABLE IF NOT EXISTS)
 * is AWAITED before the server accepts requests, so the first DB-backed write
 * can never race table creation. If schema init fails because the database is
 * unreachable, the server still starts, but `/api/health` reports `ok: false`
 * with db.ready=false and DB-backed writes return a clean 503 (persistence
 * errors are observable, never silently swallowed).
 */
import { computeCompleteness, enrichGeneratedDoc } from '../src/server/generator'
import { createBrdGenerator, activeGeneratorLabel } from '../src/server/ai-generator'
import { createDocumentGenerator, activeDocumentGeneratorLabel, type DownstreamTypeId } from '../src/server/document-generator'
import {
  createSource,
  getSource,
  getBRD,
  listSources,
  listBRDs,
  saveBRD,
  resolveBRDConflict,
  ensureSchema,
  dbConfigured,
  checkDbReachable,
} from '../src/server/db'
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_IDS,
  PROVISIONAL_DOWNSTREAM_ORDER,
  isDocumentTypeId,
  type DocumentTypeId,
  type ParentGateInfo,
} from '../src/lib/documentTypes'
import { evaluateGate } from '../src/server/gate'
import {
  createIntegrationProvider,
  activeIntegrationProviderLabel,
  assembleTranscript,
} from '../src/server/integrations'
import { isIntegrationId } from '../src/lib/integrationTypes'
import type { BRD, ServerStatus, Source, DbHealth } from '../src/types'

// API_PORT wins when set (dev: Vite owns PORT, the API binds a distinct port
// and Vite proxies /api to it). Falls back to PORT (single-server production,
// where this process serves both dist/ and /api) and finally 3000.
const PORT = Number(process.env.API_PORT || process.env.PORT || 3000)
const HOST = '0.0.0.0'
const DIST = `${import.meta.dir}/../dist`

// The BRD generator behind the generation endpoints. Real Claude when
// ANTHROPIC_API_KEY is set (with automatic rule-based fallback on any failure),
// otherwise the deterministic rule-based generator. Selected once at startup;
// the label is safe to expose (never contains the key).
const generator = createBrdGenerator()
const GENERATOR_LABEL = activeGeneratorLabel()

// The downstream document generator (PRD/spec/stories/roadmap/research) behind
// the same swappable seam. Turns a COMPLETE parent BRD into a fully-traced
// downstream document; real Claude when a key is set, else deterministic.
const documentGenerator = createDocumentGenerator()
const DOC_GENERATOR_LABEL = activeDocumentGeneratorLabel()

// The integration provider behind the source picker (list/connect/signals/
// ingest). Demo provider today (realistic sample signals, zero secrets); a real
// Composio adapter plugs into the same seam. Singleton so connection state
// persists across requests. The label is safe to expose (never a key).
const integrations = createIntegrationProvider()
const INTEGRATION_LABEL = activeIntegrationProviderLabel()

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
    return json({ ...(await healthStatus()), generator: GENERATOR_LABEL, documentGenerator: DOC_GENERATOR_LABEL, integrations: INTEGRATION_LABEL })
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

  // List persisted sources (durable lifecycle).
  if (url.pathname === '/api/sources' && req.method === 'GET') {
    const listed = await dbWrites(() => listSources())
    if (!listed.ok) return json({ error: 'Database unavailable — could not list sources.', db: await healthStatus() }, 503)
    return json({ sources: listed.value, ...(await healthStatus()) }, 200)
  }

  // Load a single persisted source by id.
  const sourceMatch = url.pathname.match(/^\/api\/sources\/([^/]+)$/)
  if (sourceMatch && req.method === 'GET') {
    const fetched = await dbWrites(() => getSource(decodeURIComponent(sourceMatch[1])))
    if (!fetched.ok) return json({ error: 'Database unavailable — could not load source.', db: await healthStatus() }, 503)
    if (!fetched.value) return json({ error: 'Source not found.' }, 404)
    return json({ source: fetched.value }, 200)
  }

  // List persisted BRDs (durable lifecycle).
  if (url.pathname === '/api/brds' && req.method === 'GET') {
    const listed = await dbWrites(() => listBRDs())
    if (!listed.ok) return json({ error: 'Database unavailable — could not list BRDs.', db: await healthStatus() }, 503)
    return json({ brds: listed.value, ...(await healthStatus()) }, 200)
  }

  // Persisted conflict resolution for a BRD.
  const conflictMatch = url.pathname.match(/^\/api\/brds\/([^/]+)\/conflicts\/([^/]+)$/)
  if (conflictMatch && req.method === 'PATCH') {
    let body: { resolved?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    if (typeof body.resolved !== 'boolean') {
      return json({ error: '`resolved` must be a boolean.' }, 400)
    }
    const result = await dbWrites(() =>
      resolveBRDConflict(decodeURIComponent(conflictMatch[1]), decodeURIComponent(conflictMatch[2]), body.resolved as boolean)
    )
    if (!result.ok) return json({ error: 'Database unavailable — could not update BRD.', db: await healthStatus() }, 503)
    if (!result.value.ok) {
      return json({ error: result.value.reason === 'brd' ? 'BRD not found.' : 'Conflict not found.' }, 404)
    }
    return json({ brd: result.value.brd, ...(await healthStatus()) }, 200)
  }

  // Load a single persisted BRD by id.
  const brdMatch = url.pathname.match(/^\/api\/brds\/([^/]+)$/)
  if (brdMatch && req.method === 'GET') {
    const fetched = await dbWrites(() => getBRD(decodeURIComponent(brdMatch[1])))
    if (!fetched.ok) return json({ error: 'Database unavailable — could not load BRD.', db: await healthStatus() }, 503)
    if (!fetched.value) return json({ error: 'BRD not found.' }, 404)
    return json({ brd: fetched.value }, 200)
  }

  // ─── Integrations: connect + browse signals + ingest into a Source ─────────
  // The source side of the loop. Demo provider today (sample signals, no
  // secrets); a real Composio adapter fills the same seam. Connect/disconnect
  // mutate in-process state; ingest turns chosen signals into a persisted Source
  // the generate journey then builds a BRD from.
  if (url.pathname === '/api/integrations' && req.method === 'GET') {
    return json({ integrations: await integrations.listAccounts(), provider: INTEGRATION_LABEL, ...(await healthStatus()) }, 200)
  }

  const connectMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)\/(connect|disconnect)$/)
  if (connectMatch && req.method === 'POST') {
    const id = decodeURIComponent(connectMatch[1])
    if (!isIntegrationId(id)) return json({ error: `Unknown integration "${id}".`, code: 'UNKNOWN_INTEGRATION' }, 422)
    const account = connectMatch[2] === 'connect' ? await integrations.connect(id) : await integrations.disconnect(id)
    return json({ integration: account }, 200)
  }

  const signalsMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)\/signals$/)
  if (signalsMatch && req.method === 'GET') {
    const id = decodeURIComponent(signalsMatch[1])
    if (!isIntegrationId(id)) return json({ error: `Unknown integration "${id}".`, code: 'UNKNOWN_INTEGRATION' }, 422)
    return json({ signals: await integrations.listSignals(id) }, 200)
  }

  // Assemble chosen signals into one transcript and persist it as a Source.
  if (url.pathname === '/api/integrations/ingest' && req.method === 'POST') {
    let body: { signalIds?: unknown; title?: unknown; author?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    const signalIds: string[] = Array.isArray(body.signalIds) ? body.signalIds.filter((s): s is string => typeof s === 'string') : []
    if (signalIds.length === 0) return json({ error: 'Select at least one signal to pull.', code: 'NO_SIGNALS' }, 422)
    const chosen = await integrations.getSignalsContent(signalIds)
    if (chosen.length === 0) return json({ error: 'None of the selected signals are available (is the account still connected?).', code: 'SIGNALS_UNAVAILABLE' }, 422)
    const rawText = assembleTranscript(chosen)
    const title = (typeof body.title === 'string' && body.title.trim()) || `${chosen.length} signal${chosen.length === 1 ? '' : 's'} — ${chosen[0].title}`
    const author = (typeof body.author === 'string' && body.author.trim()) || 'Current user'
    const written = await dbWrites(() => createSource({ title, rawText, author }))
    if (!written.ok) return json({ error: 'Database unavailable — could not persist the pulled source.', db: await healthStatus() }, 503)
    return json({ source: written.value.source, signalCount: chosen.length, ...(await healthStatus()) }, 201)
  }

  // ─── Document-type registry + gate state (feeds Generate Document) ─────────
  if (url.pathname === '/api/document-types' && req.method === 'GET') {
    const parentDocumentId = url.searchParams.get('parentDocumentId')
    const sourceCount = Math.max(0, Number(url.searchParams.get('sourceCount') || 0) || 0)
    let parent: ParentGateInfo | null = null
    if (parentDocumentId) {
      const fetched = await dbWrites(() => getBRD(parentDocumentId))
      if (!fetched.ok) return json({ error: 'Database unavailable — could not load parent document.', db: await healthStatus() }, 503)
      if (fetched.value) parent = { id: fetched.value.id, complete: fetched.value.complete }
    }
    const types = DOCUMENT_TYPE_IDS.map((t) => ({ ...DOCUMENT_TYPES[t], gate: evaluateGate({ type: t, parent, hasSources: sourceCount > 0 }) }))
    return json(
      { types, provisionalDownstreamOrder: [...PROVISIONAL_DOWNSTREAM_ORDER], ...(await healthStatus()) },
      200
    )
  }
  // ─── Type-safe, gate-enforced document generation ───────────────────────────
  // New canonical generation endpoint. Accepts requested type, brief, source IDs
  // and an optional parent document ID. NEVER falls back to the BRD generator
  // for another requested type: unknown type → 422, locked downstream → 409
  // with inspectable gate checks. The existing /api/brd/generate remains for
  // the current frontend (next frontend task will switch it to this endpoint).
  if (url.pathname === '/api/documents/generate' && req.method === 'POST') {
    let body: { type?: unknown; brief?: unknown; sourceIds?: unknown; source?: unknown; parentDocumentId?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    if (!isDocumentTypeId(body.type)) {
      return json(
        { error: `Unknown document type "${String(body.type)}". Supported: ${DOCUMENT_TYPE_IDS.join(', ')}.`, code: 'INVALID_TYPE' },
        422
      )
    }
    const type: DocumentTypeId = body.type
    const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
    const parentDocumentId = typeof body.parentDocumentId === 'string' && body.parentDocumentId ? body.parentDocumentId : null

    // BRD is the only implemented / initially-eligible type.
    if (type === 'brd') {
      const sourceIds: string[] = Array.isArray(body.sourceIds) ? body.sourceIds.filter((s): s is string => typeof s === 'string') : []
      const sources: Source[] = []
      for (const id of sourceIds) {
        const fetched = await dbWrites(() => getSource(id))
        if (!fetched.ok) return json({ error: 'Database unavailable — could not load source.', db: await healthStatus() }, 503)
        if (!fetched.value) return json({ error: `Source not found: ${id}.`, code: 'SOURCE_NOT_FOUND' }, 422)
        sources.push(fetched.value)
      }
      const inlineSource = body.source as Source | undefined
      if (inlineSource && typeof inlineSource.rawText === 'string' && inlineSource.rawText.trim()) {
        sources.push(inlineSource)
      }
      if (sources.length === 0) {
        return json(
          { error: 'At least one source is required to generate a BRD (pass `sourceIds` or a `source`).', code: 'MISSING_SOURCE' },
          422
        )
      }
      const brd = (await generator.generateBRD(sources[0])) as BRD
      brd.complete = computeCompleteness(brd)
      brd.type = 'brd'
      if (brief) brd.brief = brief
      // Structure the flat requirements into a real, sectioned document (+summary)
      // before persisting so every consumer — reload, export, viewer — sees it.
      const enriched = enrichGeneratedDoc(brd)
      const saved = await dbWrites(() => saveBRD(enriched))
      if (!saved.ok) return json({ error: 'Database unavailable — could not persist BRD.', db: await healthStatus() }, 503)
      return json({ brd: enriched, type: 'brd', ...(await healthStatus()) }, 200)
    }

    // Down-stream types: server-enforced gates. Load the full parent BRD if
    // given, evaluate the gate, and on success run the downstream generator so
    // every item derives from a real parent requirement. A locked type returns
    // 409 (never a BRD, never another type's generator).
    let parentBrd: BRD | null = null
    if (parentDocumentId) {
      const fetched = await dbWrites(() => getBRD(parentDocumentId))
      if (!fetched.ok) return json({ error: 'Database unavailable — could not load parent document.', db: await healthStatus() }, 503)
      if (!fetched.value) return json({ error: `Parent document not found: ${parentDocumentId}.`, code: 'PARENT_NOT_FOUND' }, 422)
      parentBrd = fetched.value
    }
    const parent = parentBrd ? { id: parentBrd.id, complete: parentBrd.complete } : null
    const gate = evaluateGate({ type, parent, hasSources: false })
    if (!gate.allowed) {
      return json({ error: gate.reason, code: 'DOCUMENT_LOCKED', type, gate }, 409)
    }
    // Gate passed ⇒ a complete parent BRD is guaranteed present.
    const doc = (await documentGenerator.generateDocument({ type: type as DownstreamTypeId, parent: parentBrd as BRD, brief })) as BRD
    doc.type = type
    if (brief) doc.brief = brief
    doc.complete = computeCompleteness(doc)
    const enrichedDoc = enrichGeneratedDoc(doc)
    const savedDoc = await dbWrites(() => saveBRD(enrichedDoc))
    if (!savedDoc.ok) return json({ error: 'Database unavailable — could not persist document.', db: await healthStatus() }, 503)
    return json({ brd: enrichedDoc, type, ...(await healthStatus()) }, 200)
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

    const brd = (await generator.generateBRD(source)) as BRD
    brd.complete = computeCompleteness(brd)
    const enriched = enrichGeneratedDoc(brd)

    const saved = await dbWrites(() => saveBRD(enriched))
    if (!saved.ok) return json({ error: 'Database unavailable — could not persist BRD.', db: await healthStatus() }, 503)
    return json({ brd: enriched, ...(await healthStatus()) }, 200)
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

export const server = Bun.serve({
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

console.log(`Ariadne (Knitly) serving on http://${HOST}:${PORT} — generator: ${GENERATOR_LABEL}`)
console.log(`Persistence: ${dbConfigured() ? `Neon (DATABASE_URL) — schema ${startupDb.ready ? 'ready' : 'init FAILED'}` : 'in-memory (set DATABASE_URL for durable storage)'}`)
