/**
 * Deterministic regression coverage for the Neon startup/health hardening.
 *
 * Run:  bun test server/
 * (or:  bunx bun test server/health.test.ts)
 *
 * Covers:
 *   1. Memory mode health — no DATABASE_URL => healthy, in-memory.
 *   2. Failed/configured-but-unreachable Neon — checkDbReachable reports
 *      ok:false WITHOUT leaking the URL or credentials.
 *   3. Valid Neon (conditional) — only runs when TEST_DATABASE_URL is set
 *      (never reads the real DATABASE_URL, so it can't run against prod):
 *      real SELECT 1, deterministic schema init, and a cold-start first write
 *      round trip (ensureSchema -> createSource -> getSource).
 *
 * The db.ts module reads process.env.DATABASE_URL LAZILY per call, so each
 * test can set/restore it independently in-process.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  checkDbReachable,
  createSource,
  dbConfigured,
  ensureSchema,
  getSource,
} from '../src/server/db'

// A clearly-unreachable local URL => connection refused fast, no real DB hit.
const UNREACHABLE = 'postgresql://bogus_user:bogus_pass@127.0.0.1:1/does_not_exist'

// Opt-in valid Neon URL, e.g. TEST_DATABASE_URL=<neon url> bun test server/
const VALID = process.env.TEST_DATABASE_URL

function restoreEnv() {
  if (VALID) process.env.DATABASE_URL = VALID
  else delete process.env.DATABASE_URL
}

describe('memory mode health', () => {
  beforeEach(() => delete process.env.DATABASE_URL)
  afterEach(restoreEnv)

  test('no DATABASE_URL => not configured, healthy memory mode', async () => {
    expect(dbConfigured()).toBe(false)
    const c = await checkDbReachable()
    expect(c.ok).toBe(true)
    expect(c.detail.toLowerCase()).toContain('memory')
  })
})

describe('failed Neon (configured but unreachable)', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = UNREACHABLE
  })
  afterEach(restoreEnv)

  test('configured true, reachability false', async () => {
    expect(dbConfigured()).toBe(true)
    const c = await checkDbReachable()
    expect(c.ok).toBe(false)
    expect(c.detail.toLowerCase()).toContain('unreachable')
  })

  test('does not leak the URL or credentials', async () => {
    const c = await checkDbReachable()
    const detail = c.detail.toLowerCase()
    expect(detail).not.toContain('bogus_user')
    expect(detail).not.toContain('bogus_pass')
    expect(detail).not.toContain('127.0.0.1')
    expect(detail).not.toContain(UNREACHABLE)
  })

  test('createSource surfaces an error (no silent memory fallback when configured)', async () => {
    await expect(
      createSource({ title: 't', rawText: 'x', author: 'a' })
    ).rejects.toThrow()
  })
})

// ─── Valid-Neon coverage (opt-in; skipped unless TEST_DATABASE_URL is set) ───
describe('valid Neon (TEST_DATABASE_URL set)', () => {
  const skip = VALID ? false : true
  beforeEach(() => {
    if (!VALID) return
    process.env.DATABASE_URL = VALID
  })
  afterEach(restoreEnv)

  test('SELECT 1 connectivity is healthy', async () => {
    if (skip) return
    const c = await checkDbReachable()
    expect(c.ok).toBe(true)
  })

  test('deterministic schema init then cold-start first write round trip', async () => {
    if (skip) return
    // ensureSchema must resolve (await) BEFORE the write — the startup contract.
    await ensureSchema()
    const { source, mode } = await createSource({ title: 'cold-start', rawText: 'persist me please', author: 'test' })
    expect(mode).toBe('db')
    // Read back by id to prove the table existed before the write (no CREATE race).
    const loaded = await getSource(source.id)
    expect(loaded).not.toBeNull()
    expect(loaded!.rawText).toBe('persist me please')
  })
})
