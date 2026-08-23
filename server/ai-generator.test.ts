/**
 * Coverage for the real Claude BRD adapter (src/server/ai-generator.ts).
 *
 * Run:  bun test server/
 *
 * Everything here is OFFLINE — the Anthropic call is exercised through an
 * injected fake `fetch`, and the no-key / error paths assert the deterministic
 * fallback. Two guarantees are pinned:
 *   1. HONEST PROVENANCE — a model-invented quote is never presented; it is
 *      dropped and the requirement is marked `unlinked` with an empty quote, so
 *      `computeCompleteness` correctly reports the BRD incomplete.
 *   2. ZERO-SECRET RESILIENCE — no key / network error / non-200 / empty tool
 *      call all fall back to the rule-based generator (a valid BRD still comes
 *      out).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  AiBrdGenerator,
  activeGeneratorLabel,
  assembleVerifiedBRD,
  createBrdGenerator,
  verifyQuote,
} from '../src/server/ai-generator'
import { computeCompleteness, defaultBrdGenerator } from '../src/server/generator'
import type { Source } from '../src/types'

const SOURCE: Source = {
  id: 'src-ai-1',
  title: 'Payments kickoff',
  rawText:
    'Alex: We need one-click purchasing for returning customers.\nJordan: Legal says we must never store raw card numbers.',
  author: 'Alex',
  created_at: new Date().toISOString(),
}

// ─── Fake Anthropic transport ────────────────────────────────────────────────
function toolResponse(requirements: unknown): Response {
  return {
    ok: true,
    json: async () => ({
      content: [
        { type: 'text', text: 'thinking...' },
        { type: 'tool_use', name: 'emit_requirements', input: { requirements } },
      ],
    }),
  } as unknown as Response
}
const okFetch = (requirements: unknown): typeof fetch =>
  (async () => toolResponse(requirements)) as unknown as typeof fetch
const throwingFetch: typeof fetch = (() => {
  throw new Error('network down')
}) as unknown as typeof fetch
const non200Fetch: typeof fetch = (async () =>
  ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY
const ORIGINAL_MODEL = process.env.ANTHROPIC_MODEL
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY
  if (ORIGINAL_MODEL === undefined) delete process.env.ANTHROPIC_MODEL
  else process.env.ANTHROPIC_MODEL = ORIGINAL_MODEL
})

// ─── verifyQuote: the honest-provenance primitive ────────────────────────────
describe('verifyQuote', () => {
  test('returns the verbatim source slice for a whitespace-normalized match', () => {
    const got = verifyQuote(SOURCE.rawText, 'we need   one-click purchasing for returning customers')
    expect(got).not.toBeNull()
    expect(SOURCE.rawText.includes(got!)).toBe(true)
    expect(got!.replace(/\s+/g, ' ').toLowerCase()).toBe('we need one-click purchasing for returning customers')
  })

  test('matches across a newline and returns the original slice', () => {
    const got = verifyQuote(SOURCE.rawText, 'returning customers. Jordan: Legal says we must')
    expect(got).not.toBeNull()
    expect(got).toContain('Jordan')
  })

  test('returns null for text the source does not contain', () => {
    expect(verifyQuote(SOURCE.rawText, 'we should store all card data forever')).toBeNull()
  })

  test('returns null for an empty or whitespace-only candidate', () => {
    expect(verifyQuote(SOURCE.rawText, '')).toBeNull()
    expect(verifyQuote(SOURCE.rawText, '   \n ')).toBeNull()
  })
})

// ─── Honest provenance end-to-end (via the adapter with a fake transport) ─────
describe('AiBrdGenerator — honest provenance', () => {
  test('a fabricated quote is dropped (unlinked) and makes the BRD incomplete', async () => {
    const gen = new AiBrdGenerator({
      apiKey: 'test-key',
      fetchImpl: okFetch([
        { text: 'Support one-click purchasing for returning customers.', sourceQuote: 'We need one-click purchasing for returning customers.', author: 'Alex' },
        { text: 'Store all card numbers forever for analytics.', sourceQuote: 'we should store all card data forever', author: 'Ghost' },
      ]),
    })
    const brd = await gen.generateBRD(SOURCE)

    expect(brd.requirements).toHaveLength(2)
    const [r1, r2] = brd.requirements
    // Verified requirement: quote kept (verbatim from source), status in-sync.
    expect(r1.status).toBe('in-sync')
    expect(r1.sourceQuote.length).toBeGreaterThan(0)
    expect(SOURCE.rawText.includes(r1.sourceQuote)).toBe(true)
    // Fabricated requirement: quote dropped, status unlinked.
    expect(r2.status).toBe('unlinked')
    expect(r2.sourceQuote).toBe('')
    // Untraced requirement ⇒ BRD is honestly incomplete.
    expect(computeCompleteness(brd)).toBe(false)
    expect(brd.complete).toBe(false)
  })

  test('all-verified requirements yield a complete BRD', async () => {
    const gen = new AiBrdGenerator({
      apiKey: 'test-key',
      fetchImpl: okFetch([
        { text: 'Support one-click purchasing for returning customers.', sourceQuote: 'We need one-click purchasing for returning customers.', author: 'Alex' },
        { text: 'Never store raw card numbers.', sourceQuote: 'Legal says we must never store raw card numbers.', author: 'Jordan' },
      ]),
    })
    const brd = await gen.generateBRD(SOURCE)
    expect(brd.requirements).toHaveLength(2)
    expect(brd.requirements.every((r) => r.status === 'in-sync')).toBe(true)
    expect(brd.requirements.every((r) => SOURCE.rawText.includes(r.sourceQuote))).toBe(true)
    expect(brd.conflicts).toHaveLength(0)
    expect(computeCompleteness(brd)).toBe(true)
    expect(brd.complete).toBe(true)
  })

  test('assembleVerifiedBRD skips empty-text requirements and preserves the BRD shape', () => {
    const brd = assembleVerifiedBRD(SOURCE, [
      { text: '   ', sourceQuote: 'We need one-click purchasing for returning customers.' },
      { text: 'Never store raw card numbers.', sourceQuote: 'Legal says we must never store raw card numbers.', author: 'Jordan' },
    ])
    expect(brd.requirements).toHaveLength(1)
    expect(brd.requirements[0].id).toBe('REQ-001')
    expect(brd.sourceId).toBe(SOURCE.id)
    expect(brd.title).toBe('Payments kickoff — Business Requirements')
  })
})

// ─── Zero-secret resilience: every failure path falls back deterministically ──
describe('AiBrdGenerator — fallback', () => {
  test('no API key ⇒ deterministic generator (valid BRD, no network)', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const brd = await new AiBrdGenerator().generateBRD(SOURCE)
    expect(brd.requirements.length).toBeGreaterThan(0)
    expect(brd.sourceId).toBe(SOURCE.id)
  })

  test('network error ⇒ fallback', async () => {
    const brd = await new AiBrdGenerator({ apiKey: 'test-key', fetchImpl: throwingFetch }).generateBRD(SOURCE)
    expect(brd.requirements.length).toBeGreaterThan(0)
  })

  test('non-200 response ⇒ fallback', async () => {
    const brd = await new AiBrdGenerator({ apiKey: 'test-key', fetchImpl: non200Fetch }).generateBRD(SOURCE)
    expect(brd.requirements.length).toBeGreaterThan(0)
  })

  test('empty tool result ⇒ fallback (never an empty BRD)', async () => {
    const brd = await new AiBrdGenerator({ apiKey: 'test-key', fetchImpl: okFetch([]) }).generateBRD(SOURCE)
    expect(brd.requirements.length).toBeGreaterThan(0)
  })
})

// ─── Factory + label selection ────────────────────────────────────────────────
describe('createBrdGenerator / activeGeneratorLabel', () => {
  test('no key ⇒ rule-based generator and label', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(createBrdGenerator()).toBe(defaultBrdGenerator)
    expect(activeGeneratorLabel()).toBe('rule-based')
  })

  test('key present ⇒ Claude adapter, label names the model but NOT the key', () => {
    process.env.ANTHROPIC_API_KEY = 'super-secret-key-123'
    delete process.env.ANTHROPIC_MODEL
    const gen = createBrdGenerator()
    expect((gen as { name?: string }).name).toBe('claude')
    const label = activeGeneratorLabel()
    expect(label).toContain('claude')
    expect(label).toContain('claude-sonnet-5')
    expect(label).not.toContain('super-secret-key-123')
  })

  test('label reflects a custom model override', () => {
    process.env.ANTHROPIC_API_KEY = 'k'
    process.env.ANTHROPIC_MODEL = 'claude-opus-5'
    expect(activeGeneratorLabel()).toContain('claude-opus-5')
  })
})
