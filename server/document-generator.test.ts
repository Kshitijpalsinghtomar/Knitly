/**
 * Coverage for the downstream document engine (src/server/document-generator.ts).
 *
 * Run:  bun test server/
 *
 * OFFLINE by construction — the Anthropic call is exercised through an injected
 * fake `fetch`, and the no-key / error paths assert the deterministic fallback.
 * The two product-critical guarantees are pinned:
 *   1. HONEST PROVENANCE (one level up) — a downstream item is "traced" only when
 *      it derives from a parent requirement that ACTUALLY EXISTS. An invented
 *      parent id is dropped to `unlinked` with empty provenance, so the document
 *      is honestly incomplete.
 *   2. ZERO-SECRET RESILIENCE — no key / network error / non-200 / empty tool
 *      call all fall back to the rule-based generator (a valid document still
 *      comes out).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  AiDocumentGenerator,
  RuleBasedDocumentGenerator,
  activeDocumentGeneratorLabel,
  assembleDownstreamFromRaw,
  createDocumentGenerator,
  defaultDocumentGenerator,
  type DownstreamTypeId,
} from '../src/server/document-generator'
import type { BRD, GeneratedRequirement } from '../src/types'

const req = (over: Partial<GeneratedRequirement> & { id: string }): GeneratedRequirement => ({
  text: 'placeholder',
  sourceQuote: 'placeholder quote',
  author: 'Alex',
  timestamp: '2026-01-01T00:00:00.000Z',
  status: 'in-sync',
  conflicts: [],
  ...over,
})

const PARENT: BRD = {
  id: 'brd-parent-1',
  sourceId: 'src-1',
  title: 'Payments — Business Requirements',
  author: 'Alex',
  createdAt: '2026-01-01T00:00:00.000Z',
  requirements: [
    req({ id: 'REQ-001', text: 'Support one-click purchasing for returning customers', sourceQuote: 'We need one-click purchasing for returning customers.', author: 'Alex' }),
    req({ id: 'REQ-002', text: 'Never store raw card numbers', sourceQuote: 'Legal says we must never store raw card numbers.', author: 'Jordan' }),
  ],
  conflicts: [],
  complete: true,
  type: 'brd',
}

const DOWNSTREAM: DownstreamTypeId[] = ['prd', 'spec', 'stories', 'roadmap', 'research']

// ─── Fake Anthropic transport ────────────────────────────────────────────────
function toolResponse(items: unknown): Response {
  return {
    ok: true,
    json: async () => ({
      content: [
        { type: 'text', text: 'thinking...' },
        { type: 'tool_use', name: 'emit_items', input: { items } },
      ],
    }),
  } as unknown as Response
}
const okFetch = (items: unknown): typeof fetch => (async () => toolResponse(items)) as unknown as typeof fetch
const throwingFetch: typeof fetch = (() => {
  throw new Error('network down')
}) as unknown as typeof fetch
const non200Fetch: typeof fetch = (async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY
const ORIGINAL_MODEL = process.env.ANTHROPIC_MODEL
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY
  if (ORIGINAL_MODEL === undefined) delete process.env.ANTHROPIC_MODEL
  else process.env.ANTHROPIC_MODEL = ORIGINAL_MODEL
})

// ─── Deterministic generator: complete by construction ───────────────────────
describe('RuleBasedDocumentGenerator', () => {
  test('derives exactly one traced item per parent requirement, for every type', () => {
    const gen = new RuleBasedDocumentGenerator()
    for (const type of DOWNSTREAM) {
      const doc = gen.generateDocument({ type, parent: PARENT })
      expect(doc.type).toBe(type)
      expect(doc.parentId).toBe(PARENT.id)
      expect(doc.requirements).toHaveLength(PARENT.requirements.length)
      expect(doc.conflicts).toHaveLength(0)
      // Every item traces UP to a real parent requirement.
      doc.requirements.forEach((item, i) => {
        expect(item.derivedFrom).toEqual([PARENT.requirements[i].id])
        expect(item.sourceQuote).toBe(PARENT.requirements[i].text)
        expect(item.status).toBe('in-sync')
      })
      // Complete by construction (all items traced, no conflicts).
      expect(doc.complete).toBe(true)
    }
  })

  test('carries the parent source id and derives a type-named title from the parent', () => {
    const doc = defaultDocumentGenerator.generateDocument({ type: 'prd', parent: PARENT })
    expect(doc.sourceId).toBe(PARENT.sourceId)
    expect(doc.title).toBe('Payments — Product Requirements Document')
  })

  test('records the brief when provided', () => {
    const doc = defaultDocumentGenerator.generateDocument({ type: 'spec', parent: PARENT, brief: 'ship fast' })
    expect(doc.brief).toBe('ship fast')
  })

  test('skips untraced parent requirements (never propagates fake provenance)', () => {
    const mixed: BRD = {
      ...PARENT,
      requirements: [
        PARENT.requirements[0],
        req({ id: 'REQ-002', text: 'Untraceable ask', sourceQuote: '', status: 'unlinked' }),
      ],
    }
    const doc = defaultDocumentGenerator.generateDocument({ type: 'stories', parent: mixed })
    expect(doc.requirements).toHaveLength(1)
    expect(doc.requirements[0].derivedFrom).toEqual(['REQ-001'])
    expect(doc.complete).toBe(true)
  })

  test('spec items carry an EARS detail; stories carry Gherkin detail', () => {
    const spec = defaultDocumentGenerator.generateDocument({ type: 'spec', parent: PARENT })
    expect(spec.requirements[0].detail).toContain('SHALL')
    const stories = defaultDocumentGenerator.generateDocument({ type: 'stories', parent: PARENT })
    expect(stories.requirements[0].detail).toContain('As a user')
  })
})

// ─── Honest provenance one level up (AI adapter with a fake transport) ────────
describe('AiDocumentGenerator — honest provenance', () => {
  test('an item citing an unknown parent id is dropped to unlinked and makes the doc incomplete', async () => {
    const gen = new AiDocumentGenerator({
      apiKey: 'test-key',
      fetchImpl: okFetch([
        { text: 'Product requirement: support one-click purchasing.', derivedFromReqId: 'REQ-001', detail: 'Acceptance — verifiable.' },
        { text: 'Ghost requirement not in the BRD.', derivedFromReqId: 'REQ-999' },
      ]),
    })
    const doc = await gen.generateDocument({ type: 'prd', parent: PARENT })
    expect(doc.requirements).toHaveLength(2)
    const [a, b] = doc.requirements
    expect(a.status).toBe('in-sync')
    expect(a.derivedFrom).toEqual(['REQ-001'])
    expect(a.sourceQuote).toBe(PARENT.requirements[0].text)
    expect(b.status).toBe('unlinked')
    expect(b.derivedFrom).toEqual([])
    expect(b.sourceQuote).toBe('')
    expect(doc.complete).toBe(false)
  })

  test('all-grounded items yield a complete downstream document', async () => {
    const gen = new AiDocumentGenerator({
      apiKey: 'test-key',
      fetchImpl: okFetch([
        { text: 'One-click purchasing capability.', derivedFromReqId: 'REQ-001' },
        { text: 'No raw card storage.', derivedFromReqId: 'REQ-002' },
      ]),
    })
    const doc = await gen.generateDocument({ type: 'prd', parent: PARENT })
    expect(doc.requirements).toHaveLength(2)
    expect(doc.requirements.every((r) => r.status === 'in-sync')).toBe(true)
    expect(doc.conflicts).toHaveLength(0)
    expect(doc.complete).toBe(true)
  })

  test('assembleDownstreamFromRaw skips empty-text items and preserves the doc shape', () => {
    const doc = assembleDownstreamFromRaw('spec', PARENT, [
      { text: '   ', derivedFromReqId: 'REQ-001' },
      { text: 'The system shall never store raw card numbers.', derivedFromReqId: 'REQ-002' },
    ])
    expect(doc.requirements).toHaveLength(1)
    expect(doc.requirements[0].id).toBe('SPEC-001')
    expect(doc.requirements[0].derivedFrom).toEqual(['REQ-002'])
    expect(doc.parentId).toBe(PARENT.id)
  })
})

// ─── Zero-secret resilience ───────────────────────────────────────────────────
describe('AiDocumentGenerator — fallback', () => {
  test('no API key ⇒ deterministic generator (valid doc, no network)', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const doc = await new AiDocumentGenerator().generateDocument({ type: 'prd', parent: PARENT })
    expect(doc.requirements.length).toBeGreaterThan(0)
    expect(doc.type).toBe('prd')
  })

  test('network error ⇒ fallback', async () => {
    const doc = await new AiDocumentGenerator({ apiKey: 'test-key', fetchImpl: throwingFetch }).generateDocument({ type: 'roadmap', parent: PARENT })
    expect(doc.requirements.length).toBeGreaterThan(0)
    expect(doc.type).toBe('roadmap')
  })

  test('non-200 response ⇒ fallback', async () => {
    const doc = await new AiDocumentGenerator({ apiKey: 'test-key', fetchImpl: non200Fetch }).generateDocument({ type: 'research', parent: PARENT })
    expect(doc.requirements.length).toBeGreaterThan(0)
  })

  test('empty tool result ⇒ fallback (never an empty document)', async () => {
    const doc = await new AiDocumentGenerator({ apiKey: 'test-key', fetchImpl: okFetch([]) }).generateDocument({ type: 'stories', parent: PARENT })
    expect(doc.requirements.length).toBeGreaterThan(0)
  })
})

// ─── Factory + label selection ────────────────────────────────────────────────
describe('createDocumentGenerator / activeDocumentGeneratorLabel', () => {
  test('no key ⇒ rule-based generator and label', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(createDocumentGenerator()).toBe(defaultDocumentGenerator)
    expect(activeDocumentGeneratorLabel()).toBe('rule-based')
  })

  test('key present ⇒ Claude adapter, label names the model but NOT the key', () => {
    process.env.ANTHROPIC_API_KEY = 'super-secret-key-123'
    delete process.env.ANTHROPIC_MODEL
    const gen = createDocumentGenerator()
    expect((gen as { name?: string }).name).toBe('claude')
    const label = activeDocumentGeneratorLabel()
    expect(label).toContain('claude-sonnet-5')
    expect(label).not.toContain('super-secret-key-123')
  })
})
