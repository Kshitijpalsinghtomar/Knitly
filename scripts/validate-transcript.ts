/**
 * Offline end-to-end validation of the real pipeline over genuine transcripts.
 *
 *   npx --yes bun scripts/validate-transcript.ts
 *
 * Exercises the ACTUAL server-side generators (no HTTP, no secrets, no mocks):
 *   source → RuleBasedBrdGenerator → BRD (attribution + source-quote trace)
 *          → detectConflicts / computeCompleteness (the gate)
 *          → RuleBasedDocumentGenerator → downstream doc (provenance one level up)
 *
 * It prints what actually comes out so the extraction can be eyeballed on real
 * data, and it hard-asserts the load-bearing invariants (every BRD requirement
 * traced; every downstream item derived from a real parent requirement). Exits
 * non-zero if any invariant breaks.
 */
import { defaultBrdGenerator, computeCompleteness } from '../src/server/generator'
import { defaultDocumentGenerator, type DownstreamTypeId } from '../src/server/document-generator'
import { SAMPLE_TRANSCRIPTS } from '../src/data/samples'
import type { BRD, Source } from '../src/types'

let failures = 0
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++
    console.error(`  ✗ ASSERT FAILED: ${msg}`)
  }
}
const line = () => console.log('─'.repeat(78))

function summarizeBrd(brd: BRD) {
  const speakers = [...new Set(brd.requirements.map((r) => r.author))]
  const traced = brd.requirements.filter((r) => r.sourceQuote && r.sourceQuote.trim()).length
  console.log(`  title:        ${brd.title}`)
  console.log(`  requirements: ${brd.requirements.length}  (traced: ${traced})`)
  console.log(`  speakers:     ${speakers.join(', ')}`)
  console.log(`  conflicts:    ${brd.conflicts.length}  (open: ${brd.conflicts.filter((c) => !c.resolved).length})`)
  console.log(`  complete:     ${brd.complete}`)
  console.log('  first requirements:')
  for (const r of brd.requirements.slice(0, 5)) {
    console.log(`    ${r.id}  [${r.author}]  ${r.text.slice(0, 82)}${r.text.length > 82 ? '…' : ''}`)
  }
  for (const c of brd.conflicts) {
    console.log(`    ⚠ ${c.id} (${c.severity}): ${c.title}`)
  }
}

for (const sample of SAMPLE_TRANSCRIPTS) {
  line()
  console.log(`SAMPLE: ${sample.id} — "${sample.title}"`)
  line()
  const source: Source = {
    id: `src-${sample.id}`,
    title: sample.title,
    rawText: sample.text,
    author: sample.id === 'county-commission' ? 'Chairman Wormsley' : 'Katrina',
    created_at: '2026-08-23T12:00:00.000Z',
  }

  const brd = defaultBrdGenerator.generateBRD(source) as BRD
  summarizeBrd(brd)

  // Invariants: extraction produced something, and every requirement is traced
  // to a non-empty source quote (the whole point of the BRD).
  assert(brd.requirements.length > 0, `${sample.id}: extracted at least one requirement`)
  assert(
    brd.requirements.every((r) => r.sourceQuote && r.sourceQuote.trim().length > 0),
    `${sample.id}: every requirement carries a source quote`
  )
  assert(
    brd.requirements.every((r) => r.author && r.author.trim().length > 0),
    `${sample.id}: every requirement has an attributed speaker`
  )

  // Drive the BRD to complete (resolve any detected conflicts) so we can walk
  // the downstream chain — mirrors what the user does in the UI.
  const resolved: BRD = {
    ...brd,
    conflicts: brd.conflicts.map((c) => ({ ...c, resolved: true })),
  }
  resolved.complete = computeCompleteness(resolved)
  assert(resolved.complete, `${sample.id}: BRD is complete once conflicts are resolved`)

  // Downstream: every supported type derives one traced item per parent req.
  const downstream: DownstreamTypeId[] = ['prd', 'spec', 'stories', 'roadmap', 'research']
  console.log('  downstream generation (provenance one level up):')
  for (const type of downstream) {
    const doc = defaultDocumentGenerator.generateDocument({ type, parent: resolved }) as BRD
    const allDerived = doc.requirements.every((r) => r.derivedFrom && r.derivedFrom.length > 0 && r.sourceQuote.trim())
    console.log(`    ${type.padEnd(8)} → ${String(doc.requirements.length).padStart(3)} items · complete=${doc.complete} · parentId=${doc.parentId === resolved.id}`)
    assert(doc.type === type, `${sample.id}/${type}: produced the requested type (never coerced)`)
    assert(doc.parentId === resolved.id, `${sample.id}/${type}: links to its parent BRD`)
    assert(allDerived, `${sample.id}/${type}: every item derives from a real parent requirement`)
    assert(doc.complete, `${sample.id}/${type}: downstream doc is complete by construction`)
  }
  // Show one concrete PRD item so the shaping is visible.
  const prd = defaultDocumentGenerator.generateDocument({ type: 'prd', parent: resolved }) as BRD
  if (prd.requirements[0]) {
    const it = prd.requirements[0]
    console.log(`  sample PRD item: ${it.id}  ← ${it.derivedFrom?.[0]}`)
    console.log(`    text:   ${it.text.slice(0, 88)}`)
    console.log(`    detail: ${(it.detail || '').slice(0, 88)}`)
  }
}

line()
if (failures === 0) {
  console.log('✓ ALL INVARIANTS HELD — the real pipeline survives both transcripts end to end.')
  process.exit(0)
} else {
  console.error(`✗ ${failures} invariant(s) failed.`)
  process.exit(1)
}
