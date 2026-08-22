/**
 * Ariadne server-side document-type gate.
 *
 * Enforces generation eligibility for every supported document type and returns
 * inspectable per-check results (the "why") so clients and humans can see
 * exactly what blocks a down-stream document, never a silent fallback.
 *
 * Rules (provisional, configurable via src/lib/documentTypes.ts):
 *   - BRD is the only initially eligible generation type. It is allowed whenever
 *     at least one source is supplied.
 *   - Every downstream type (PRD, Tech Spec, User Stories, Roadmap, Research)
 *     is LOCKED until BOTH: its generator adapter is implemented, AND a valid,
 *     complete, current BRD parent is provided. Today no downstream adapter is
 *     implemented, so these never generate — the reason says so honestly.
 *
 * The order/eligibility lives in `PROVISIONAL_DOWNSTREAM_ORDER` and
 * `DOCUMENT_TYPES` (shared registry). This function reads those; it does not
 * hardcode the canonical chain, so ratifying the real order is a registry edit.
 */
import {
  DOCUMENT_TYPES,
  PROVISIONAL_DOWNSTREAM_ORDER,
  type DocumentTypeGate,
  type DocumentTypeId,
  type ParentGateInfo,
} from '../lib/documentTypes'

export interface GateInput {
  type: DocumentTypeId
  /** The current candidate parent document (a BRD) when one is supplied. */
  parent?: ParentGateInfo | null
  /** True when at least one source is selected for BRD generation. */
  hasSources: boolean
}

/**
 * Evaluate the generation gate for one document type. Pure and synchronous.
 * Returns inspectable checks plus an aggregate `allowed` / `reason` that the
 * API surfaces directly (→ 200 for eligible/ready, 409 for locked).
 */
export function evaluateGate(input: GateInput): DocumentTypeGate {
  const meta = DOCUMENT_TYPES[input.type]
  const checks: DocumentTypeGate['checks'] = [
    { key: 'supported', ok: true, reason: `${meta.name} is a supported document type.` },
  ]

  // BRD — the initial gate.
  if (meta.isInitial) {
    checks.push({ key: 'initial-gate', ok: true, reason: 'BRD is the first document gate — the only initially eligible generation type.' })
    checks.push({ key: 'adapter-implemented', ok: true, reason: 'BRD generation is implemented.' })
    checks.push({
      key: 'sources-present',
      ok: input.hasSources,
      reason: input.hasSources ? 'At least one source is selected.' : 'At least one source is required to generate a BRD.',
    })
    const allowed = input.hasSources
    return {
      type: input.type,
      allowed,
      eligible: true,
      reason: allowed
        ? 'BRD can be generated now — provide sources and an optional brief.'
        : 'BRD is the initial gate and is ready once at least one source is provided.',
      checks,
    }
  }

  // Down-stream types — locked until the adapter exists AND a complete BRD parent is supplied.
  const predecessor = PROVISIONAL_DOWNSTREAM_ORDER[0] // 'brd'
  checks.push({
    key: 'adapter-implemented',
    ok: meta.implemented,
    reason: meta.implemented
      ? `${meta.name} generation is implemented.`
      : `${meta.name} generation is not implemented yet — only ${DOCUMENT_TYPES[predecessor].label} can currently be generated.`,
  })
  checks.push({
    key: 'parent-required',
    ok: !!input.parent,
    reason: input.parent
      ? `Parent document ${input.parent.id} provided.`
      : `${meta.name} requires a parent document — a current, complete ${DOCUMENT_TYPES[predecessor].label}.`,
  })
  checks.push({
    key: 'parent-complete',
    ok: !!input.parent?.complete,
    reason: input.parent?.complete
      ? 'Parent BRD is complete (all requirements traced, all conflicts resolved).'
      : 'Parent document is missing or not complete (all requirements traced and conflicts resolved required).',
  })

  const allowed = meta.implemented && !!input.parent?.complete
  const eligible = !!input.parent?.complete
  const reasons: string[] = []
  if (!meta.implemented) reasons.push(`${meta.name} generation is not implemented yet (locked).`)
  if (!input.parent) reasons.push(`A current, complete ${DOCUMENT_TYPES[predecessor].label} parent is required before ${meta.name} can be generated.`)
  else if (!input.parent.complete) reasons.push('The parent BRD is not complete.')

  return {
    type: input.type,
    allowed,
    eligible,
    reason: allowed ? 'Ready to generate.' : reasons.join(' '),
    checks,
  }
}
