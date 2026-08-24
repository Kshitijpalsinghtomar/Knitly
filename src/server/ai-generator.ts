import type { BRD, GeneratedRequirement, Source } from '../types'
import {
  type BrdGenerator,
  computeCompleteness,
  defaultBrdGenerator,
  detectConflicts,
} from './generator'

/**
 * ─── Real model adapter (Claude) behind the `BrdGenerator` seam ────────────────
 *
 * `AiBrdGenerator` implements the SAME `BrdGenerator` contract as the
 * deterministic `RuleBasedBrdGenerator`, so the server can swap it in with no
 * other changes. It calls the Anthropic Messages API directly via `fetch` (no
 * SDK dependency — Bun ships a global fetch), using tool-forcing to get
 * structured requirements back.
 *
 * TWO hard guarantees preserved here:
 *
 *  1. HONEST PROVENANCE. A model can hallucinate a "source quote." So every
 *     quote the model returns is verified SERVER-SIDE against the actual source
 *     text (`verifyQuote`): only a verbatim (whitespace-normalized) substring is
 *     accepted, and the stored quote is the exact slice FROM THE SOURCE — never
 *     the model's paraphrase. A requirement whose quote can't be verified is
 *     marked `unlinked` with an EMPTY quote, so `computeCompleteness` (which
 *     requires every requirement to carry a real quote) will correctly report
 *     the BRD as incomplete. The product never presents a citation the source
 *     doesn't contain.
 *
 *  2. ZERO-SECRET RESILIENCE. With no `ANTHROPIC_API_KEY`, on any API error, a
 *     non-200 response, an empty/garbled tool call, or a timeout, it falls back
 *     to `RuleBasedBrdGenerator` — mirroring the db→memory fallback in db.ts.
 *     The app still builds and runs with no secrets configured.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-5'
const DEFAULT_TIMEOUT_MS = 60_000

const SYSTEM_PROMPT = [
  "You are Knitly's requirement extractor.",
  'Extract atomic business/product requirements from the provided source (a meeting transcript, notes, email, or chat log).',
  'RULES:',
  '- Each requirement is a single, testable statement of intent — not a summary of the whole discussion.',
  '- For EVERY requirement you MUST provide a `sourceQuote` copied VERBATIM (character-for-character) from the source text that justifies it. Never paraphrase the quote. If no verbatim quote supports a requirement, do not emit that requirement.',
  '- Attribute each requirement to the speaker/author when the source identifies one.',
  '- Extract only genuine requirements. Ignore greetings, filler, scheduling, and small talk.',
].join('\n')

const EMIT_TOOL = {
  name: 'emit_requirements',
  description: 'Return the extracted requirements, each with a verbatim source quote and (when identifiable) its author.',
  input_schema: {
    type: 'object',
    properties: {
      requirements: {
        type: 'array',
        description: 'The extracted requirements, in the order they appear in the source.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The requirement as a single, testable statement of intent.' },
            sourceQuote: { type: 'string', description: 'A VERBATIM substring of the source text that justifies this requirement.' },
            author: { type: 'string', description: 'Who expressed it, if the source identifies a speaker/author. Optional.' },
          },
          required: ['text', 'sourceQuote'],
        },
      },
    },
    required: ['requirements'],
  },
} as const

interface RawRequirement {
  text?: unknown
  sourceQuote?: unknown
  author?: unknown
}

/** Minimal shape of the Anthropic Messages response we depend on. */
interface AnthropicMessage {
  content?: Array<{ type?: string; name?: string; input?: { requirements?: unknown } }>
}

// ─── Honest-provenance verification ──────────────────────────────────────────

/**
 * Build a whitespace-normalized view of `text` (runs of whitespace collapse to a
 * single space) together with an index map back to the ORIGINAL string, so a
 * match found in the normalized view can be sliced verbatim from the original.
 */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  let inWhitespace = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (/\s/.test(ch)) {
      if (!inWhitespace) {
        norm += ' '
        map.push(i)
        inWhitespace = true
      }
    } else {
      norm += ch
      map.push(i)
      inWhitespace = false
    }
  }
  return { norm, map }
}

/**
 * Verify a model-proposed quote is REAL: a verbatim (whitespace-normalized,
 * case-insensitive) substring of the source. Returns the exact slice AS IT
 * APPEARS IN THE SOURCE (original casing/spacing, trimmed) when found, or `null`
 * when the quote cannot be located — i.e. the model made it up. This is the
 * guarantee that a displayed "source quote" always exists in the source.
 */
export function verifyQuote(rawText: string, candidate: string): string | null {
  const cand = (candidate || '').replace(/\s+/g, ' ').trim()
  if (!cand) return null
  const { norm, map } = normalizeWithMap(rawText)
  const idx = norm.toLowerCase().indexOf(cand.toLowerCase())
  if (idx === -1) return null
  const start = map[idx]
  const end = map[idx + cand.length - 1] + 1
  return rawText.slice(start, end).trim()
}

/**
 * Assemble a `BRD` from raw model output, verifying every quote against the
 * source. Shared shape with `RuleBasedBrdGenerator` (same id/title/timestamp
 * scheme, same conflict reverse-linking) so both adapters are interchangeable.
 */
export function assembleVerifiedBRD(source: Source, rawReqs: RawRequirement[]): BRD {
  const requirements: GeneratedRequirement[] = []
  for (const r of rawReqs) {
    const text = typeof r.text === 'string' ? r.text.trim() : ''
    if (!text) continue
    const proposedQuote = typeof r.sourceQuote === 'string' ? r.sourceQuote : ''
    const verified = verifyQuote(source.rawText, proposedQuote)
    const author = (typeof r.author === 'string' ? r.author.trim() : '') || source.author || 'Unknown speaker'
    const id = `REQ-${String(requirements.length + 1).padStart(3, '0')}`
    requirements.push({
      id,
      text: text.replace(/\.$/, ''),
      // Honest provenance: keep the quote ONLY if it verifiably exists in the
      // source; otherwise leave it empty so completeness reflects reality.
      sourceQuote: verified ?? '',
      author,
      timestamp: source.created_at,
      status: verified ? 'in-sync' : 'unlinked',
      conflicts: [],
    })
  }

  // Reuse the exact same deterministic conflict engine as the rule-based path,
  // then reverse-link conflicts onto the requirements they involve.
  const conflicts = detectConflicts(requirements)
  const byId = (id: string) => requirements.find((req) => req.id === id)
  for (const c of conflicts) {
    byId(c.reqA)?.conflicts.push(c)
    byId(c.reqB)?.conflicts.push(c)
  }

  const brd: BRD = {
    id: `brd-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    sourceId: source.id,
    title: `${source.title} — Business Requirements`,
    author: source.author,
    createdAt: new Date().toISOString(),
    requirements,
    conflicts,
    complete: false,
  }
  brd.complete = computeCompleteness(brd)
  return brd
}

export interface AiBrdGeneratorOptions {
  /** Overrides `process.env.ANTHROPIC_API_KEY`. When absent, falls back. */
  apiKey?: string
  /** Overrides `process.env.ANTHROPIC_MODEL` (default `claude-sonnet-5`). */
  model?: string
  /** Injectable fetch for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
  /** Adapter used whenever the AI path is unavailable or fails. */
  fallback?: BrdGenerator
  /** Request timeout in ms (default 60s). */
  timeoutMs?: number
}

export class AiBrdGenerator implements BrdGenerator {
  readonly name = 'claude'
  private readonly opts: AiBrdGeneratorOptions

  constructor(opts: AiBrdGeneratorOptions = {}) {
    this.opts = opts
  }

  async generateBRD(source: Source): Promise<BRD> {
    const apiKey = this.opts.apiKey ?? process.env.ANTHROPIC_API_KEY
    const fallback = this.opts.fallback ?? defaultBrdGenerator
    // No key → deterministic path (builds & runs with zero secrets).
    if (!apiKey) return fallback.generateBRD(source)

    const model = this.opts.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
    const doFetch = this.opts.fetchImpl ?? fetch
    const timeoutMs = this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

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
          system: SYSTEM_PROMPT,
          tools: [EMIT_TOOL],
          tool_choice: { type: 'tool', name: EMIT_TOOL.name },
          messages: [
            {
              role: 'user',
              content:
                `SOURCE TITLE: ${source.title}\n` +
                `AUTHOR: ${source.author}\n\n` +
                `SOURCE TEXT:\n"""\n${source.rawText}\n"""\n\n` +
                'Extract every genuine requirement, each with a verbatim source quote.',
            },
          ],
        }),
      })

      if (!res.ok) return fallback.generateBRD(source)

      const data = (await res.json()) as AnthropicMessage
      const toolUse = Array.isArray(data.content)
        ? data.content.find((b) => b?.type === 'tool_use' && b?.name === EMIT_TOOL.name)
        : undefined
      const rawReqs = toolUse?.input?.requirements
      if (!Array.isArray(rawReqs) || rawReqs.length === 0) return fallback.generateBRD(source)

      const brd = assembleVerifiedBRD(source, rawReqs as RawRequirement[])
      // If nothing survived (e.g. all empty text), the deterministic path may
      // still find requirements via its heuristics — don't return an empty BRD.
      if (brd.requirements.length === 0) return fallback.generateBRD(source)
      return brd
    } catch {
      return fallback.generateBRD(source)
    }
  }
}

/**
 * Select the BRD generator for the server: real Claude when
 * `ANTHROPIC_API_KEY` is set (with automatic rule-based fallback baked in),
 * otherwise the deterministic generator directly.
 */
export function createBrdGenerator(): BrdGenerator {
  return process.env.ANTHROPIC_API_KEY ? new AiBrdGenerator() : defaultBrdGenerator
}

/** Human-readable label for the active generator (for /api/health + logs). Never leaks the key. */
export function activeGeneratorLabel(): string {
  if (!process.env.ANTHROPIC_API_KEY) return 'rule-based'
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  return `claude:${model} (rule-based fallback)`
}
