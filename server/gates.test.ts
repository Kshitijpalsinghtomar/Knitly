/**
 * Regression coverage for server-enforced document types & prerequisite gates.
 *
 * Run:  bun test server/
 *
 * Covers (P0 requirements):
 *  1. Registry exposes all six supported types preserving naming conventions.
 *  2. BRD is the only initially-eligible type and is allowed with valid sources.
 *  3. Every downstream type (PRD, Tech Spec, User Stories, Roadmap, Research)
 *     is LOCKED — even with a complete BRD parent — until its adapter exists,
 *     with an exact, honest reason. Never falls back to the BRD generator.
 *  4. Unknown type ids are rejected (type mismatch never produces a BRD).
 *  5. Real HTTP endpoint behavior (direct API calls cannot bypass the gate):
 *       - POST /api/documents/generate with a downstream type → 409 + gate
 *       - unknown type → 422
 *       - BRD with no source → 422
 *       - BRD with a valid source → 200, returns a BRD with type/brief recorded
 *  6. GET /api/document-types lists all types with per-type gate state.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { DOCUMENT_TYPE_IDS, DOCUMENT_TYPES, PROVISIONAL_DOWNSTREAM_ORDER, isDocumentTypeId, type DocumentTypeGate } from '../src/lib/documentTypes'
import { evaluateGate } from '../src/server/gate'

describe('document-type registry', () => {
  test('lists all six supported types preserving naming conventions', () => {
    expect([...DOCUMENT_TYPE_IDS]).toEqual(['brd', 'prd', 'spec', 'stories', 'roadmap', 'research'])
    expect(DOCUMENT_TYPES.brd.label).toBe('BRD')
    expect(DOCUMENT_TYPES.prd.label).toBe('PRD')
    expect(DOCUMENT_TYPES.spec.label).toBe('Tech Spec')
    expect(DOCUMENT_TYPES.stories.label).toBe('User Stories')
    expect(DOCUMENT_TYPES.roadmap.label).toBe('Roadmap')
    expect(DOCUMENT_TYPES.research.label).toBe('Research')
    expect(PROVISIONAL_DOWNSTREAM_ORDER[0]).toBe('brd')
  })

  test('registry marks BRD implemented and initial; downstream types are not implemented', () => {
    expect(DOCUMENT_TYPES.brd.implemented).toBe(true)
    expect(DOCUMENT_TYPES.brd.isInitial).toBe(true)
    for (const id of ['prd', 'spec', 'stories', 'roadmap', 'research'] as const) {
      expect(DOCUMENT_TYPES[id].implemented).toBe(false)
      expect(DOCUMENT_TYPES[id].isInitial).toBe(false)
    }
  })

  test('isDocumentTypeId narrows known ids and rejects unknown/mismatched values', () => {
    for (const id of DOCUMENT_TYPE_IDS) expect(isDocumentTypeId(id)).toBe(true)
    expect(isDocumentTypeId('bogus')).toBe(false)
    expect(isDocumentTypeId('BRD')).toBe(false) // case-sensitive: a type mismatch is not silently coerced
    expect(isDocumentTypeId(123)).toBe(false)
    expect(isDocumentTypeId(undefined)).toBe(false)
  })
})

describe('gate evaluation (server-side enforcement)', () => {
  test('BRD is eligible and allowed with valid sources', () => {
    const gate = evaluateGate({ type: 'brd', hasSources: true })
    expect(gate.allowed).toBe(true)
    expect(gate.eligible).toBe(true)
    expect(gate.checks.some((c) => c.key === 'initial-gate' && c.ok)).toBe(true)
    expect(gate.checks.find((c) => c.key === 'sources-present')!.ok).toBe(true)
  })

  test('BRD is disallowed without sources but still the initial/eligible type', () => {
    const gate = evaluateGate({ type: 'brd', hasSources: false })
    expect(gate.allowed).toBe(false)
    expect(gate.eligible).toBe(true)
    expect(gate.checks.find((c) => c.key === 'sources-present')!.ok).toBe(false)
  })

  test('every downstream type is locked with an exact honest reason', () => {
    for (const id of ['prd', 'spec', 'stories', 'roadmap', 'research'] as const) {
      // No parent at all.
      const noParent = evaluateGate({ type: id, hasSources: false })
      expect(noParent.allowed).toBe(false)
      expect(noParent.eligible).toBe(false)
      expect(noParent.reason).toContain('not implemented yet')
      expect(noParent.reason).toContain('parent')

      // A complete parent is still NOT enough — the adapter does not exist yet.
      const completeParent = evaluateGate({ type: id, hasSources: false, parent: { id: 'brd-1', complete: true } })
      expect(completeParent.allowed).toBe(false)
      expect(completeParent.eligible).toBe(true)
      expect(completeParent.reason).toContain('not implemented yet')
      // adapter-implemented check must be the reason that keeps it locked.
      expect(completeParent.checks.find((c) => c.key === 'adapter-implemented')!.ok).toBe(false)
      expect(completeParent.checks.find((c) => c.key === 'parent-complete')!.ok).toBe(true)
    }
  })

  test('a downstream type with an incomplete parent reports the parent check explicitly', () => {
    const gate = evaluateGate({ type: 'prd', hasSources: false, parent: { id: 'brd-1', complete: false } })
    expect(gate.allowed).toBe(false)
    expect(gate.checks.find((c) => c.key === 'parent-complete')!.ok).toBe(false)
    expect(gate.reason).toContain('not complete')
  })

  test('a downstream type never yields an allowed/blank result (no BRD fallback)', () => {
    for (const id of ['prd', 'spec', 'stories', 'roadmap', 'research'] as const) {
      const gate = evaluateGate({ type: id, hasSources: true, parent: { id: 'brd-1', complete: true } })
      expect(gate.allowed).toBe(false)
      expect((DOCUMENT_TYPES[id].id) === 'brd').toBe(false)
      expect(gate.type).toBe(id)
    }
  })
})

// ─── Real HTTP endpoint coverage (the server cannot be bypassed) ─────────────
const TEST_PORT = 8791
const BASE = `http://127.0.0.1:${TEST_PORT}`
const TEST_SERVER_KEY = '__ariadne_test_server'
beforeAll(async () => {
  // Start the real production server in-memory mode on an ephemeral test port so
  // the HTTP path (route guards, status codes, gate payloads) is exercised.
  const prevPort = process.env.PORT
  const prevDb = process.env.DATABASE_URL
  process.env.PORT = String(TEST_PORT)
  delete process.env.DATABASE_URL
  const mod = await import('./index')
  ;(globalThis as Record<string, unknown>)[TEST_SERVER_KEY] = mod
  if (prevPort === undefined) delete process.env.PORT
  else process.env.PORT = prevPort
  if (prevDb === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = prevDb
})
afterAll(() => {
  // Stop the in-process test server so the test process can exit cleanly.
  const mod = (globalThis as Record<string, unknown>)[TEST_SERVER_KEY] as { server?: { stop: (closeActiveConnections?: boolean) => void } } | undefined
  mod?.server?.stop(true)
})

/** Generate a BRD over the real endpoint and return its id + complete flag. */
async function makeBrd(): Promise<{ id: string; complete: boolean }> {
  const res = await fetch(`${BASE}/api/documents/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'brd',
      brief: 'Test brief',
      source: { id: 'src-test', title: 'Kickoff', rawText: 'We need one-click purchasing for our customers.', author: 'Alex', created_at: new Date().toISOString() },
    }),
  })
  expect(res.status).toBe(200)
  const data = (await res.json()) as { brd: { id: string; complete: boolean; type?: string; brief?: string } }
  expect(data.brd.type).toBe('brd')
  expect(data.brd.brief).toBe('Test brief')
  return { id: data.brd.id, complete: data.brd.complete }
}

describe('HTTP /api/documents/generate (direct bypass rejected)', () => {
  test('BRD is generated with a valid source and records type + brief', async () => {
    const res = await fetch(`${BASE}/api/documents/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'brd',
        brief: 'Blank-slate brief',
        source: { id: 'src-b', title: 'Notes', rawText: 'We need a fast and secure checkout flow for all users.', author: 'Ana', created_at: new Date().toISOString() },
      }),
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { brd: { type?: string; brief?: string } }
    expect(data.brd.type).toBe('brd')
    expect(data.brd.brief).toBe('Blank-slate brief')
  })

  test('unknown / mismatched type is rejected with 422 (never a BRD)', async () => {
    const res = await fetch(`${BASE}/api/documents/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'brd2', sourceIds: ['src-x'] }),
    })
    expect(res.status).toBe(422)
    const data = (await res.json()) as { code?: string; brd?: unknown }
    expect(data.code).toBe('INVALID_TYPE')
    expect('brd' in data).toBe(false)
  })

  test('BRD without any source is rejected with 422', async () => {
    const res = await fetch(`${BASE}/api/documents/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'brd', sourceIds: [] }),
    })
    expect(res.status).toBe(422)
    expect(((await res.json()) as { code?: string }).code).toBe('MISSING_SOURCE')
  })

  test('PRD requested directly is locked with 409 + inspectable gate, returns no BRD', async () => {
    // Direct API call with no parent at all — must be locked, never a BRD.
    const res = await fetch(`${BASE}/api/documents/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'prd', brief: 'wants a PRD anyway' }),
    })
    expect(res.status).toBe(409)
    const data = (await res.json()) as { code?: string; gate?: DocumentTypeGate; brd?: unknown }
    expect(data.code).toBe('DOCUMENT_LOCKED')
    expect(data.gate?.allowed).toBe(false)
    expect(data.gate?.checks.find((c) => c.key === 'adapter-implemented')?.ok).toBe(false)
    expect('brd' in data).toBe(false)
  })

  test('every downstream type is locked over HTTP even with a complete BRD parent', async () => {
    const { id } = await makeBrd()
    for (const type of ['prd', 'spec', 'stories', 'roadmap', 'research'] as const) {
      const res = await fetch(`${BASE}/api/documents/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, parentDocumentId: id, brief: `want a ${type}` }),
      })
      expect(res.status).toBe(409)
      const data = (await res.json()) as { gate?: DocumentTypeGate; brd?: unknown }
      expect(data.gate?.checks.find((c) => c.key === 'parent-complete')?.ok).toBe(true)
      expect(data.gate?.checks.find((c) => c.key === 'adapter-implemented')?.ok).toBe(false)
      expect('brd' in data).toBe(false)
    }
  })

  test('downstream with a missing parent returns 422 PARENT_NOT_FOUND', async () => {
    const res = await fetch(`${BASE}/api/documents/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'prd', parentDocumentId: 'no-such-brd' }),
    })
    expect(res.status).toBe(422)
    expect(((await res.json()) as { code?: string }).code).toBe('PARENT_NOT_FOUND')
  })
})

describe('HTTP /api/document-types (registry + gate state)', () => {
  test('lists all six types with per-type gate state', async () => {
    const res = await fetch(`${BASE}/api/document-types?sourceCount=1`)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { types: { id: string; gate: DocumentTypeGate }[]; provisionalDownstreamOrder: string[] }
    expect(data.types.map((t) => t.id)).toEqual([...DOCUMENT_TYPE_IDS])
    const brdType = data.types.find((t) => t.id === 'brd')!
    expect(brdType.gate.allowed).toBe(true)
    // With a complete parent supplied (and sources present), downstream types
    // still report locked while BRD reports allowed.
    const { id } = await makeBrd()
    const res2 = await fetch(`${BASE}/api/document-types?parentDocumentId=${id}&sourceCount=1`)
    const data2 = (await res2.json()) as { types: { id: string; gate: DocumentTypeGate }[] }
    for (const t of data2.types) {
      if (t.id === 'brd') expect(t.gate.allowed).toBe(true)
      else expect(t.gate.allowed).toBe(false)
    }
    expect(data.provisionalDownstreamOrder).toEqual([...PROVISIONAL_DOWNSTREAM_ORDER])
  })
})
