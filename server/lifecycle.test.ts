/**
 * Deterministic regression coverage for the durable document/source lifecycle:
 * list / load-by-id / persisted conflict resolution / recompute `complete`.
 *
 * Run:  bun test server/
 *
 * Covers:
 *   1. Memory mode — create a source, list it, save a BRD with an open conflict,
 *      load it back, list BRDs, resolve the conflict through the durable resolver,
 *      and confirm the stored BRD now reports `complete: true`.
 *   2. Configured-but-unreachable Neon — the durable lifecycle operations surface
 *      an error instead of silently falling back to memory (consistent with 503).
 *   3. Valid Neon (conditional) — full round trip through list/load/resolve when
 *      TEST_DATABASE_URL is set (never reads the real DATABASE_URL).
 *
 * The db.ts module reads process.env.DATABASE_URL LAZILY per call, so each test
 * can set/restore it independently in-process.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  checkDbReachable,
  createSource,
  dbConfigured,
  ensureSchema,
  getBRD,
  getSource,
  listBRDs,
  listSources,
  resolveBRDConflict,
  saveBRD,
} from '../src/server/db'
import type { BRD } from '../src/types'

// A clearly-unreachable local URL => connection refused fast, no real DB hit.
const UNREACHABLE = 'postgresql://bogus_user:bogus_pass@127.0.0.1:1/does_not_exist'

// Opt-in valid Neon URL, e.g. TEST_DATABASE_URL=<neon url> bun test server/
const VALID = process.env.TEST_DATABASE_URL

function restoreEnv() {
  if (VALID) process.env.DATABASE_URL = VALID
  else delete process.env.DATABASE_URL
}

/** Build a BRD that is incomplete ONLY because of one open conflict. */
function makeBRD(id: string, sourceId: string, resolved: boolean): BRD {
  return {
    id,
    sourceId,
    title: 'Test — Business Requirements',
    author: 'tester',
    createdAt: new Date().toISOString(),
    requirements: [
      {
        id: 'REQ-001',
        text: 'Support one-click purchasing.',
        sourceQuote: 'We definitely need one-click purchasing.',
        author: 'tester',
        timestamp: new Date().toISOString(),
        status: 'in-sync',
        conflicts: [{ id: 'CON-001', severity: 'major', reqA: 'REQ-001', reqB: 'REQ-002', title: 'REQ-001 contradicts REQ-002', desc: 'desc', fix: 'fix', resolved }],
      },
    ],
    conflicts: [{ id: 'CON-001', severity: 'major', reqA: 'REQ-001', reqB: 'REQ-002', title: 'REQ-001 contradicts REQ-002', desc: 'desc', fix: 'fix', resolved }],
    complete: resolved,
  }
}

describe('memory mode lifecycle', () => {
  beforeEach(() => delete process.env.DATABASE_URL)
  afterEach(restoreEnv)

  test('source can be created, listed, and loaded by id', async () => {
    const { source, mode } = await createSource({ title: 'Kickoff', rawText: 'We need one-click purchasing.', author: 'Alex' })
    expect(mode).toBe('memory')
    const all = await listSources()
    expect(all.some((s) => s.id === source.id)).toBe(true)
    const loaded = await getSource(source.id)
    expect(loaded).not.toBeNull()
    expect(loaded!.rawText).toBe('We need one-click purchasing.')
    expect(await getSource('does-not-exist')).toBeNull()
  })

  test('BRD can be saved, listed, and loaded by id', async () => {
    const { source } = await createSource({ title: 'Kickoff', rawText: 'We need one-click purchasing.', author: 'Alex' })
    const brd = makeBRD('brd-mem-1', source.id, false)
    await saveBRD(brd)
    const listed = await listBRDs()
    expect(listed.some((b) => b.id === brd.id)).toBe(true)
    const loaded = await getBRD(brd.id)
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe(brd.id)
    expect(await getBRD('does-not-exist')).toBeNull()
  })

  test('conflict resolution is persisted and recomputes complete', async () => {
    const { source } = await createSource({ title: 'Kickoff', rawText: 'We need one-click purchasing.', author: 'Alex' })
    const brd = makeBRD('brd-resolve-1', source.id, false)
    await saveBRD(brd)
    expect((await getBRD(brd.id))!.complete).toBe(false)

    const result = await resolveBRDConflict(brd.id, 'CON-001', true)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brd.conflicts[0].resolved).toBe(true)
    expect(result.brd.complete).toBe(true)

    // Durable: a fresh read reflects the persisted resolution.
    const reloaded = await getBRD(brd.id)
    expect(reloaded!.conflicts[0].resolved).toBe(true)
    expect(reloaded!.complete).toBe(true)
  })

  test('resolve rejects a missing BRD and a missing conflict', async () => {
    const { source } = await createSource({ title: 'Kickoff', rawText: 'We need one-click purchasing.', author: 'Alex' })
    const brd = makeBRD('brd-miss-1', source.id, false)
    await saveBRD(brd)

    const missingBrd = await resolveBRDConflict('no-such-brd', 'CON-001', true)
    expect(missingBrd.ok).toBe(false)
    if (missingBrd.ok) return
    expect(missingBrd.reason).toBe('brd')

    const missingConflict = await resolveBRDConflict(brd.id, 'CON-999', true)
    expect(missingConflict.ok).toBe(false)
    if (missingConflict.ok) return
    expect(missingConflict.reason).toBe('conflict')
  })
})

describe('configured-but-unreachable Neon lifecycle', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = UNREACHABLE
  })
  afterEach(restoreEnv)

  test('list/get lifespan operations surface errors (no silent memory fallback)', async () => {
    expect(dbConfigured()).toBe(true)
    expect((await checkDbReachable()).ok).toBe(false)
    // Every lifecycle operation must throw rather than silently return memory state.
    await expect(listSources()).rejects.toThrow()
    await expect(getSource('x')).rejects.toThrow()
    await expect(listBRDs()).rejects.toThrow()
    await expect(getBRD('x')).rejects.toThrow()
    await expect(saveBRD(makeBRD('brd-unreachable', 'src-unreachable', false))).rejects.toThrow()
    await expect(resolveBRDConflict('brd-unreachable', 'CON-001', true)).rejects.toThrow()
  })
})

// ─── Valid-Neon coverage (opt-in; skipped unless TEST_DATABASE_URL is set) ───
describe('valid Neon lifecycle (TEST_DATABASE_URL set)', () => {
  const skip = VALID ? false : true
  beforeEach(() => {
    if (!VALID) return
    process.env.DATABASE_URL = VALID
  })
  afterEach(restoreEnv)

  test('full round trip: create → list → load → resolve → reload complete', async () => {
    if (skip) return
    await ensureSchema()
    const { source } = await createSource({ title: 'Cold-start', rawText: 'We need one-click purchasing.', author: 'Alex' })
    const brd = makeBRD('brd-neon-lifecycle', source.id, false)
    await saveBRD(brd)

    expect((await listSources()).some((s) => s.id === source.id)).toBe(true)
    const loaded = await getBRD(brd.id)
    expect(loaded).not.toBeNull()
    expect(loaded!.complete).toBe(false)

    const result = await resolveBRDConflict(brd.id, 'CON-001', true)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brd.complete).toBe(true)

    const reloaded = await getBRD(brd.id)
    expect(reloaded!.conflicts[0].resolved).toBe(true)
    expect(reloaded!.complete).toBe(true)
  })
})
