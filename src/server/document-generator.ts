import type { BRD, DocType, GeneratedRequirement } from '../types'
import { computeCompleteness } from './generator'
import { DOCUMENT_TYPES, type DocumentTypeId } from '../lib/documentTypes'

/**
 * ─── Downstream document engine (the second half of the traceability chain) ────
 *
 * A BRD traces DOWN from a source: every requirement carries a verbatim source
 * quote. A downstream document (PRD / Tech Spec / User Stories / Roadmap /
 * Research) traces UP from a COMPLETE BRD: every item derives from one parent
 * BRD requirement. That is the whole product thesis — provenance one level up —
 * so the same `BRD` shape, the same `computeCompleteness` gate, the same viewer
 * and the same persistence all carry over unchanged. Only the transform differs.
 *
 * `DocumentGenerator` is the seam (mirrors `BrdGenerator`): a deterministic,
 * zero-secret `RuleBasedDocumentGenerator` is the default, and `AiDocumentGenerator`
 * swaps in when `ANTHROPIC_API_KEY` is set — with the SAME two guarantees:
 *
 *  1. HONEST PROVENANCE (one level up). A downstream item is only "traced" when
 *     it derives from a parent requirement that ACTUALLY EXISTS in the parent
 *     BRD. The AI adapter must cite a real parent requirement id; an invented id
 *     is dropped (item marked `unlinked`, empty provenance) so the document is
 *     honestly incomplete. The rule-based adapter derives one item per traced
 *     parent requirement, so it is complete by construction.
 *
 *  2. ZERO-SECRET RESILIENCE. No key / API error / non-200 / empty tool call all
 *     fall back to the deterministic generator — a valid downstream doc always
 *     comes out, with no secrets configured.
 */

/** A downstream document type — any supported type except the initial BRD. */
export type DownstreamTypeId = Exclude<DocumentTypeId, 'brd'>

export interface DocumentGenInput {
  /** The downstream type to produce (never 'brd'). */
  type: DownstreamTypeId
  /** The COMPLETE parent BRD every item derives from. */
  parent: BRD
  /** The user's requested brief, captured at generation time (optional). */
  brief?: string
}

export interface DocumentGenerator {
  /** Generate a fully-traced downstream document from a complete parent BRD. */
  generateDocument(input: DocumentGenInput): Promise<BRD> | BRD
}

// ─── Per-type shaping ─────────────────────────────────────────────────────────
/** Requirement-id prefix per downstream type (mirrors the BRD's `REQ-###`). */
const TYPE_PREFIX: Record<DownstreamTypeId, string> = {
  prd: 'PRD',
  spec: 'SPEC',
  stories: 'US',
  roadmap: 'MS',
  research: 'RQ',
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const stripPeriod = (s: string) => s.trim().replace(/\.$/, '')

/**
 * Deterministically shape one parent requirement into a type-appropriate
 * downstream item (`text` + optional `detail`). Colon-prefixed phrasing keeps
 * the output grammatical regardless of the parent's wording; the type-specific
 * structure (EARS line, Gherkin, roadmap phase, research method) lives in
 * `detail`. This is the zero-secret floor — the AI adapter produces better prose
 * behind the same seam.
 */
function shape(type: DownstreamTypeId, parentText: string, index: number): { text: string; detail: string } {
  const p = stripPeriod(parentText)
  switch (type) {
    case 'prd':
      return {
        text: `Product requirement: ${cap(p)}.`,
        detail: `Acceptance — satisfied when ${lowerFirst(p)} is delivered and independently verifiable.`,
      }
    case 'spec':
      return {
        text: `Technical requirement: ${cap(p)}.`,
        detail: `EARS — WHEN the triggering condition occurs, the system SHALL ${lowerFirst(p)}.`,
      }
    case 'stories':
      return {
        text: `User story: ${cap(p)}.`,
        detail: `As a user, I want ${lowerFirst(p)}, so that the business need is met.\nGiven the capability exists · When the user engages it · Then ${lowerFirst(p)}.`,
      }
    case 'roadmap':
      return {
        text: `Milestone: ${cap(p)}.`,
        detail: `Phase ${1 + Math.floor(index / 3)} — sequenced delivery of this milestone.`,
      }
    case 'research':
      return {
        text: `Research question: does "${p}" hold, and what evidence supports it?`,
        detail: 'Method — validate this assumption with user/market evidence before build.',
      }
  }
}

/**
 * Assemble the downstream `BRD` (the universal document shape). Shared by both
 * adapters so the id/title/completeness scheme is identical. Downstream docs
 * carry `conflicts: []` — they inherit integrity from a COMPLETE parent rather
 * than re-detecting contradictions — so completeness reduces to "every item
 * traces to a real parent requirement".
 */
function finalizeDoc(type: DownstreamTypeId, parent: BRD, requirements: GeneratedRequirement[], brief?: string): BRD {
  const baseTitle = parent.title.replace(/\s+—\s+Business Requirements$/, '').trim() || parent.title
  const brd: BRD = {
    id: `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    sourceId: parent.sourceId,
    title: `${baseTitle} — ${DOCUMENT_TYPES[type].name}`,
    author: parent.author,
    createdAt: new Date().toISOString(),
    requirements,
    conflicts: [],
    complete: false,
    type: type as DocType,
    parentId: parent.id,
  }
  if (brief && brief.trim()) brd.brief = brief.trim()
  brd.complete = computeCompleteness(brd)
  return brd
}

/** The traced parent requirements a downstream doc may derive from. */
function tracedParentReqs(parent: BRD): GeneratedRequirement[] {
  return parent.requirements.filter((r) => r.sourceQuote && r.sourceQuote.trim().length > 0)
}

/**
 * Deterministic downstream generation. No AI, no secrets. Derives exactly one
 * item per TRACED parent requirement, so the result is complete by construction
 * (every item traces up to a real parent requirement). Untraced parent
 * requirements are skipped rather than propagated as fake provenance.
 */
export class RuleBasedDocumentGenerator implements DocumentGenerator {
  generateDocument({ type, parent, brief }: DocumentGenInput): BRD {
    const requirements: GeneratedRequirement[] = tracedParentReqs(parent).map((pr, i) => {
      const { text, detail } = shape(type, pr.text, i)
      return {
        id: `${TYPE_PREFIX[type]}-${String(i + 1).padStart(3, '0')}`,
        text,
        // Provenance one level up: the parent requirement statement itself.
        sourceQuote: pr.text,
        author: pr.author,
        timestamp: pr.timestamp,
        status: 'in-sync',
        conflicts: [],
        derivedFrom: [pr.id],
        detail: detail || undefined,
      }
    })
    return finalizeDoc(type, parent, requirements, brief)
  }
}

// ─── Real model adapter (Claude) behind the same seam ────────────────────────
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-5'
const DEFAULT_TIMEOUT_MS = 60_000

/** Type-specific instruction for the downstream extractor. */
function systemPromptFor(type: DownstreamTypeId): string {
  const kind: Record<DownstreamTypeId, string> = {
    prd: 'a Product Requirements Document — concrete product capabilities and acceptance criteria',
    spec: 'a Technical Specification — testable system requirements, ideally in EARS phrasing (e.g. "WHEN <trigger>, the system SHALL <response>")',
    stories: 'a set of User Stories — "As a <role>, I want <goal>, so that <benefit>" with Given/When/Then acceptance criteria',
    roadmap: 'a Roadmap — sequenced milestones grouped into delivery phases',
    research: 'a Research plan — the open questions and assumptions to validate before build, each with a method',
  }
  return [
    "You are TraceLayer's downstream document generator.",
    `Produce ${kind[type]} DERIVED FROM a complete, already-approved Business Requirements Document (BRD).`,
    'RULES:',
    '- Every item you emit MUST derive from exactly one parent BRD requirement, cited by its id in `derivedFromReqId`.',
    '- `derivedFromReqId` MUST be one of the parent requirement ids provided. NEVER invent an id. If you cannot ground an item in a real parent requirement, do not emit it.',
    '- Keep items atomic and testable. Put type-specific structure (EARS line, Gherkin, phase, method) in `detail`.',
    '- Do not introduce requirements the parent BRD does not support — this document inherits its scope from the BRD.',
  ].join('\n')
}

const EMIT_TOOL = {
  name: 'emit_items',
  description: 'Return the downstream document items, each grounded in exactly one parent BRD requirement id.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'The downstream items, in a sensible reading order.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The item as a single, testable statement.' },
            derivedFromReqId: { type: 'string', description: 'The id of the parent BRD requirement this item derives from (must be one of the provided ids).' },
            detail: { type: 'string', description: 'Optional type-specific elaboration (EARS line, Gherkin, roadmap phase, research method).' },
          },
          required: ['text', 'derivedFromReqId'],
        },
      },
    },
    required: ['items'],
  },
} as const

interface RawItem {
  text?: unknown
  derivedFromReqId?: unknown
  detail?: unknown
}

interface AnthropicMessage {
  content?: Array<{ type?: string; name?: string; input?: { items?: unknown } }>
}

/**
 * Assemble a downstream `BRD` from raw model output, verifying every item's
 * cited parent requirement id against the ACTUAL parent BRD. An item that cites
 * a real parent requirement is traced (provenance = that requirement's text); an
 * item citing an unknown id is kept but marked `unlinked` with empty provenance,
 * so `computeCompleteness` honestly reports the document incomplete. Exported for
 * offline testing.
 */
export function assembleDownstreamFromRaw(type: DownstreamTypeId, parent: BRD, rawItems: RawItem[], brief?: string): BRD {
  const byId = new Map(parent.requirements.map((r) => [r.id, r]))
  const requirements: GeneratedRequirement[] = []
  for (const raw of rawItems) {
    const text = typeof raw.text === 'string' ? raw.text.trim() : ''
    if (!text) continue
    const citedId = typeof raw.derivedFromReqId === 'string' ? raw.derivedFromReqId.trim() : ''
    const pr = byId.get(citedId)
    const detail = typeof raw.detail === 'string' && raw.detail.trim() ? raw.detail.trim() : undefined
    requirements.push({
      id: `${TYPE_PREFIX[type]}-${String(requirements.length + 1).padStart(3, '0')}`,
      text,
      // Honest provenance one level up: keep the link ONLY if the cited parent
      // requirement really exists; otherwise leave it empty (→ unlinked).
      sourceQuote: pr ? pr.text : '',
      author: pr?.author ?? parent.author,
      timestamp: pr?.timestamp ?? parent.createdAt,
      status: pr ? 'in-sync' : 'unlinked',
      conflicts: [],
      derivedFrom: pr ? [pr.id] : [],
      detail,
    })
  }
  return finalizeDoc(type, parent, requirements, brief)
}

export interface AiDocumentGeneratorOptions {
  apiKey?: string
  model?: string
  fetchImpl?: typeof fetch
  fallback?: DocumentGenerator
  timeoutMs?: number
}

export class AiDocumentGenerator implements DocumentGenerator {
  readonly name = 'claude'
  private readonly opts: AiDocumentGeneratorOptions

  constructor(opts: AiDocumentGeneratorOptions = {}) {
    this.opts = opts
  }

  async generateDocument(input: DocumentGenInput): Promise<BRD> {
    const { type, parent, brief } = input
    const apiKey = this.opts.apiKey ?? process.env.ANTHROPIC_API_KEY
    const fallback = this.opts.fallback ?? defaultDocumentGenerator
    if (!apiKey) return fallback.generateDocument(input)

    const model = this.opts.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
    const doFetch = this.opts.fetchImpl ?? fetch
    const timeoutMs = this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

    // Only real (traced) parent requirements are offered as grounding anchors.
    const anchors = tracedParentReqs(parent)
    if (anchors.length === 0) return fallback.generateDocument(input)
    const parentList = anchors.map((r) => `${r.id}: ${r.text}`).join('\n')

    try {
      const res = await doFetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPromptFor(type),
          tools: [EMIT_TOOL],
          tool_choice: { type: 'tool', name: EMIT_TOOL.name },
          messages: [
            {
              role: 'user',
              content:
                `PARENT BRD: ${parent.title}\n` +
                (brief ? `BRIEF: ${brief}\n` : '') +
                `\nPARENT REQUIREMENTS (cite these ids in derivedFromReqId):\n${parentList}\n\n` +
                `Produce the ${DOCUMENT_TYPES[type].name}. Every item must derive from one of the parent requirement ids above.`,
            },
          ],
        }),
      })

      if (!res.ok) return fallback.generateDocument(input)

      const data = (await res.json()) as AnthropicMessage
      const toolUse = Array.isArray(data.content)
        ? data.content.find((b) => b?.type === 'tool_use' && b?.name === EMIT_TOOL.name)
        : undefined
      const rawItems = toolUse?.input?.items
      if (!Array.isArray(rawItems) || rawItems.length === 0) return fallback.generateDocument(input)

      const brd = assembleDownstreamFromRaw(type, parent, rawItems as RawItem[], brief)
      if (brd.requirements.length === 0) return fallback.generateDocument(input)
      return brd
    } catch {
      return fallback.generateDocument(input)
    }
  }
}

/** The default deterministic downstream generator used by the server. */
export const defaultDocumentGenerator: DocumentGenerator = new RuleBasedDocumentGenerator()

/**
 * Select the downstream generator: real Claude when `ANTHROPIC_API_KEY` is set
 * (with automatic rule-based fallback baked in), otherwise the deterministic
 * generator directly. Mirrors `createBrdGenerator`.
 */
export function createDocumentGenerator(): DocumentGenerator {
  return process.env.ANTHROPIC_API_KEY ? new AiDocumentGenerator() : defaultDocumentGenerator
}

/** Human-readable label for the active downstream generator. Never leaks the key. */
export function activeDocumentGeneratorLabel(): string {
  if (!process.env.ANTHROPIC_API_KEY) return 'rule-based'
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  return `claude:${model} (rule-based fallback)`
}
