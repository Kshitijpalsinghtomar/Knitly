/**
 * Coverage for document *structuring* (src/server/generator.ts) — the layer that
 * turns a flat `requirements[]` into a real, sectioned document.
 *
 * Run:  bun test server/
 *
 * These pin the guarantees the viewer and Markdown export depend on:
 *   1. DETERMINISTIC SECTIONING — `sectionForBrdRequirement` maps a requirement
 *      to its IEEE-830 bucket by signal words, with a `functional` floor.
 *   2. IDEMPOTENT, NON-DESTRUCTIVE ENRICHMENT — `enrichGeneratedDoc` fills a
 *      `section` on every requirement and a narrative `summary`, but NEVER
 *      overwrites one a generator already set, and never mutates its input.
 *   3. HONEST NARRATIVE — `buildSummary` reflects real completeness (open
 *      conflicts, untraced items) rather than always claiming success.
 */
import { describe, expect, test } from 'bun:test'
import {
  buildSummary,
  enrichGeneratedDoc,
  sectionForBrdRequirement,
} from '../src/server/generator'
import { primarySectionKey } from '../src/lib/documentTypes'
import type { BRD, GeneratedRequirement, SourceConflict } from '../src/types'

const req = (over: Partial<GeneratedRequirement> & { id: string; text: string }): GeneratedRequirement => ({
  sourceQuote: over.text,
  author: 'Alex',
  timestamp: '2026-01-01T00:00:00.000Z',
  status: 'in-sync',
  conflicts: [],
  ...over,
})

const brd = (over: Partial<BRD> & { requirements: GeneratedRequirement[] }): BRD => ({
  id: 'brd-1',
  sourceId: 'src-1',
  title: 'Checkout — Business Requirements',
  author: 'Alex',
  createdAt: '2026-01-01T00:00:00.000Z',
  conflicts: [],
  complete: false,
  type: 'brd',
  ...over,
})

describe('sectionForBrdRequirement', () => {
  test('classifies by the highest-priority signal present', () => {
    expect(sectionForBrdRequirement('The checkout must meet p95 latency under 200ms')).toBe('nonfunctional')
    expect(sectionForBrdRequirement('Increase conversion by 20% this quarter')).toBe('objectives')
    expect(sectionForBrdRequirement('We assume the payment provider is out of scope for phase 1')).toBe('assumptions')
    expect(sectionForBrdRequirement('As a returning customer I want to save my card')).toBe('stakeholders')
    expect(sectionForBrdRequirement('The MVP will launch on the web app platform first')).toBe('scope')
  })

  test('falls back to functional when no signal matches', () => {
    expect(sectionForBrdRequirement('Users can filter their previous purchases by date')).toBe('functional')
  })
})

describe('enrichGeneratedDoc — BRD', () => {
  const input = brd({
    requirements: [
      req({ id: 'REQ-001', text: 'Increase conversion by 20% this quarter' }),
      req({ id: 'REQ-002', text: 'The checkout must meet p95 latency under 200ms' }),
      req({ id: 'REQ-003', text: 'Users can filter their purchases by date' }),
      // A requirement the generator ALREADY sectioned — must be preserved verbatim.
      req({ id: 'REQ-004', text: 'Something ambiguous', section: 'stakeholders' }),
    ],
  })

  test('assigns a section to every requirement, honouring pre-set sections', () => {
    const out = enrichGeneratedDoc(input)
    const byId = Object.fromEntries(out.requirements.map((r) => [r.id, r.section]))
    expect(byId['REQ-001']).toBe('objectives')
    expect(byId['REQ-002']).toBe('nonfunctional')
    expect(byId['REQ-003']).toBe('functional')
    expect(byId['REQ-004']).toBe('stakeholders') // not reclassified to 'functional'
    expect(out.requirements.every((r) => !!r.section)).toBe(true)
  })

  test('writes a summary and is pure (never mutates its input)', () => {
    const out = enrichGeneratedDoc(input)
    expect(out.summary && out.summary.length > 0).toBe(true)
    // Input untouched: the un-sectioned requirement stays un-sectioned.
    expect(input.requirements[0].section).toBeUndefined()
    expect(input.summary).toBeUndefined()
    expect(out).not.toBe(input)
  })

  test('preserves a summary the generator already produced', () => {
    const pre = enrichGeneratedDoc(brd({ requirements: input.requirements, summary: 'A hand-written read.' }))
    expect(pre.summary).toBe('A hand-written read.')
  })
})

describe('enrichGeneratedDoc — downstream', () => {
  test('drops every item into the type primary bucket', () => {
    const prd = brd({
      id: 'prd-1',
      type: 'prd',
      parentId: 'brd-1',
      title: 'Checkout — Product Requirements',
      requirements: [
        req({ id: 'CAP-001', text: 'One-click reorder', derivedFrom: ['REQ-001'] }),
        req({ id: 'CAP-002', text: 'Saved payment methods', derivedFrom: ['REQ-002'] }),
      ],
    })
    const out = enrichGeneratedDoc(prd)
    const primary = primarySectionKey('prd') // 'capabilities'
    expect(out.requirements.every((r) => r.section === primary)).toBe(true)
    expect(out.summary).toContain('derived from the parent BRD')
  })
})

describe('buildSummary — honesty', () => {
  const reqs = [
    req({ id: 'REQ-001', text: 'Increase conversion by 20% this quarter' }),
    req({ id: 'REQ-002', text: 'Users can filter their purchases by date' }),
  ]

  test('a complete BRD reads as complete and unlocked', () => {
    const s = buildSummary(brd({ requirements: reqs, complete: true }))
    expect(s).toContain('2 requirements')
    expect(s.toLowerCase()).toContain('complete')
    expect(s).toContain('unlocked')
  })

  test('an open conflict is surfaced as needing a decision', () => {
    const conflict: SourceConflict = {
      id: 'CON-001', severity: 'major', reqA: 'REQ-001', reqB: 'REQ-002',
      title: 'REQ-001 contradicts REQ-002', desc: '…', fix: '…', resolved: false,
    }
    const s = buildSummary(brd({ requirements: reqs, conflicts: [conflict], complete: false }))
    expect(s).toContain('contradiction')
    expect(s.toLowerCase()).toContain('decision')
  })

  test('an untraced requirement keeps the BRD honestly incomplete', () => {
    const s = buildSummary(brd({
      requirements: [req({ id: 'REQ-001', text: 'Traced item' }), req({ id: 'REQ-002', text: 'Orphan', sourceQuote: '' })],
      complete: false,
    }))
    expect(s).toContain('source quote')
    expect(s).toContain('not yet complete')
  })
})
