import type { BRD, GeneratedRequirement, Source, SourceConflict } from '../types'
import { DOCUMENT_TYPES, primarySectionKey, type DocumentTypeId } from '../lib/documentTypes'

/**
 * ─── Model-adapter contract ───────────────────────────────────────────────────
 *
 * `BrdGenerator` is the seam a real model adapter plugs into later. Today it is
 * satisfied by `RuleBasedBrdGenerator` (a deterministic, zero-secret mock). A
 * future LLM adapter implements the same interface and can be swapped in by the
 * server (`server/index.ts`) — e.g. an `AiBrdGenerator` that calls a model API
 * and returns the same `BRD` shape, preserving source-quote traceability.
 */
export interface BrdGenerator {
  /** Generate a fully-traced BRD from an ingested source. */
  generateBRD(source: Source): Promise<BRD> | BRD
}

// ─── Conflict heuristics ───────────────────────────────────────────────────────
// Contradiction groups: [positive-pole words, negative-pole words]. A conflict is
// flagged when two requirements share a topic keyword AND sit on opposite poles.
const CONTRADICTION_GROUPS: [string[], string[], 'major' | 'minor'][] = [
  [['must', 'required', 'mandatory', 'always'], ['must not', 'never', 'blocked', 'prohibited'], 'major'],
  [['support', 'allow', 'include', 'accept', 'enable'], ['block', 'exclude', 'reject', 'remove', 'disable'], 'major'],
  [['free', 'no charge'], ['paid', 'charge', 'fee'], 'minor'],
  [['increase', 'faster', 'more', 'grow'], ['decrease', 'slower', 'less', 'shrink', 'drop'], 'minor'],
  [['low', 'minimal', 'reduce'], ['high', 'maximal', 'raise'], 'minor'],
]

const TOPIC_KEYWORDS = [
  'payment', 'checkout', 'fraud', 'speed', 'order', 'auth', 'currency', 'card',
  'support', 'page', 'mobile', 'limit', 'amount', 'scope', 'price', 'rate',
  'refund', 'step', 'redirect', 'user', 'discount', 'api', 'session', 'threshold',
  'one-click', 'buy', 'purchase', 'cart', 'returning',
]

// Explicit contradiction phrasing — flags a conflict even when the policy wording
// doesn't fall neatly into the positive/negative pole groups (e.g. "one-click buy
// ... conflicts with ... fraud check").
const CONTRADICTION_MARKERS = [
  'conflicts with', 'conflict with', 'contradicts', 'contradiction',
  'clashes with', 'is at odds with', 'but cannot', 'however, we cannot',
]

const hasAny = (text: string, words: string[]) =>
  words.some((w) => text.toLowerCase().includes(w))

export function detectConflicts(reqs: GeneratedRequirement[]): SourceConflict[] {
  const conflicts: SourceConflict[] = []
  let n = 0
  const pushConflict = (a: GeneratedRequirement, b: GeneratedRequirement, severity: 'major' | 'minor') => {
    n++
    conflicts.push({
      id: `CON-${String(n).padStart(3, '0')}`,
      severity,
      reqA: a.id,
      reqB: b.id,
      title: `${a.id} contradicts ${b.id}`,
      desc: `${a.text} (from ${a.author}) conflicts with ${b.text} (from ${b.author}).`,
      fix: 'Reconcile the two requirements to a single agreed behaviour, then mark this conflict resolved.',
      resolved: false,
    })
  }

  for (let i = 0; i < reqs.length; i++) {
    for (let j = i + 1; j < reqs.length; j++) {
      const a = reqs[i]
      const b = reqs[j]
      const aT = a.text.toLowerCase()
      const bT = b.text.toLowerCase()
      const sharedTopic = TOPIC_KEYWORDS.some((t) => aT.includes(t) && bT.includes(t))
      if (!sharedTopic) continue

      // Explicit contradiction phrasing takes priority and is flagged as major.
      const explicit = CONTRADICTION_MARKERS.some((m) => aT.includes(m) || bT.includes(m))
      if (explicit) {
        pushConflict(a, b, 'major')
        continue
      }

      for (const [pos, neg, severity] of CONTRADICTION_GROUPS) {
        const aPos = hasAny(a.text, pos)
        const bNeg = hasAny(b.text, neg)
        const bPos = hasAny(b.text, pos)
        const aNeg = hasAny(a.text, neg)
        if ((aPos && bNeg) || (bPos && aNeg)) {
          pushConflict(a, b, severity)
          break
        }
      }
    }
  }
  return conflicts
}

// ─── Transcript parsing ───────────────────────────────────────────────────────
interface Utterance {
  author: string
  text: string
}

function parseTranscript(source: Source): Utterance[] {
  const DEFAULT_AUTHOR = source.author || 'Unknown speaker'
  const lines = source.rawText.split(/\r?\n/)
  const out: Utterance[] = []
  let currentAuthor = DEFAULT_AUTHOR
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const speaker = line.match(/^([A-Za-z][A-Za-z .'-]{1,40}?)\s*:\s*(.+)$/)
    if (speaker) {
      currentAuthor = speaker[1].trim()
      out.push({ author: currentAuthor, text: speaker[2].trim() })
    } else if (line.includes(':')) {
      // Possibly "Timestamp Author: text" style — pull the right-most prefix.
      const parts = line.split(/:\s*/)
      const maybeName = parts[0].split(/\s+/).slice(-3).join(' ')
      if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(maybeName)) {
        out.push({ author: maybeName, text: parts.slice(1).join(': ').trim() })
      } else {
        out.push({ author: currentAuthor, text: line })
      }
    } else {
      out.push({ author: currentAuthor, text: line })
    }
  }
  return out
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
}

/**
 * Deterministic rule-based BRD generation. No AI, no secrets — the "real" model
 * adapter will replace this later behind the same `BrdGenerator` interface.
 */
export class RuleBasedBrdGenerator implements BrdGenerator {
  generateBRD(source: Source): BRD {
    const utterances = parseTranscript(source)
    const requirements: GeneratedRequirement[] = []
    const quotePool: string[] = []

    for (const utt of utterances) {
      for (const sentence of splitSentences(utt.text)) {
        // Keep sentences long enough to read as a requirement (skip filler).
        const words = sentence.split(/\s+/).filter(Boolean)
        if (words.length < 6) continue
        if (/^(thanks|ok|great|sounds|awesome|yes|no|good|perfect|yeah|um|hmm)/i.test(sentence)) continue
        const id = `REQ-${String(requirements.length + 1).padStart(3, '0')}`
        const req: GeneratedRequirement = {
          id,
          text: sentence.replace(/\.$/, ''),
          sourceQuote: sentence,
          author: utt.author,
          timestamp: source.created_at,
          status: 'in-sync',
          conflicts: [],
        }
        requirements.push(req)
        quotePool.push(sentence)
      }
    }

    // Assign conflicts (reverse-links onto the involved requirements).
    const conflicts = detectConflicts(requirements)
    const byId = (id: string) => requirements.find((r) => r.id === id)
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
}

/**
 * Ariadne core gate: a BRD is "complete" only if every requirement is traced to
 * a source quote AND there are no unresolved conflicts.
 */
export function computeCompleteness(brd: Pick<BRD, 'requirements' | 'conflicts'>): boolean {
  const allTraced = brd.requirements.every((r) => r.sourceQuote && r.sourceQuote.trim().length > 0)
  const noOpenConflicts = brd.conflicts.every((c) => c.resolved)
  return allTraced && noOpenConflicts
}

// ─── Document structuring (flat requirements → a real, sectioned document) ─────
/**
 * The whole reason a generated BRD "just shows extracted requirements" is that
 * the raw generators emit a flat `requirements[]`. `enrichGeneratedDoc` is the
 * one place that turns that list into a *document*: it classifies every BRD
 * requirement into an IEEE-830 section (`sectionForBrdRequirement`) and writes a
 * plain-language `summary` ("Trace's read"). Applied once in the server route so
 * BOTH the rule-based and AI generators — BRD and downstream — gain structure
 * without touching their internals or the AI tool schema. Pure and idempotent:
 * it never overwrites a section/summary a generator already set.
 */

// Ordered signal groups: the FIRST group whose keyword appears wins, so the list
// runs from most-specific (technical NFRs, measurable objectives) to the
// catch-all `functional`. Keywords are matched as substrings of the space-padded
// lowercased text, so a leading/trailing space anchors word-ish boundaries.
const SECTION_SIGNALS: { key: string; words: string[] }[] = [
  {
    key: 'nonfunctional',
    words: [
      'performance', 'latency', 'throughput', 'concurrent', 'uptime', 'availability',
      'reliab', 'scalab', 'secure', 'security', 'encrypt', 'pci', 'gdpr', 'hipaa',
      'ccpa', 'soc 2', 'compliance', 'compliant', 'accessib', 'wcag', 'sla', 'p95',
      'p99', 'response time', 'downtime', 'data retention', 'rate limit',
      // "percentile" must land here, not in objectives — it contains "percent".
      'percentile', 'th percentile', 'requests per', 'per second', 'availab',
    ],
  },
  {
    key: 'objectives',
    words: [
      'objective', 'goal', 'increase', 'decrease', 'reduce', 'boost', 'grow',
      'growth', 'target', 'kpi', 'metric', 'conversion', 'revenue', 'retention',
      'abandon', '%', 'percent', 'roi', 'north star',
    ],
  },
  {
    key: 'assumptions',
    words: [
      'assume', 'assumption', 'dependency', 'depends on', 'constraint', 'budget',
      'deadline', 'timeline', 'out of scope', 'exclude', 'not support', 'will not',
      "won't", 'provided that', 'subject to', 'pending', 'blocked on', 'tbd',
      'to be decided',
    ],
  },
  {
    key: 'stakeholders',
    words: [
      'as a ', 'persona', 'stakeholder', 'admin user', 'end user', 'customer segment',
      'finance team', 'legal team', 'ops team', 'sales team', 'for internal',
    ],
  },
  {
    key: 'scope',
    words: [
      'in scope', 'scope of', 'platform', 'cross-platform', 'web app', 'mobile app',
      'ios', 'android', 'desktop', 'region', 'market', 'locale', 'launch', 'rollout',
      'go-live', 'geograph', 'phase 1', 'mvp',
    ],
  },
]

/**
 * Classify a BRD requirement into an IEEE-830 section key (a `key` from
 * `DOCUMENT_SECTIONS.brd`). Deterministic and dependency-free — the AI generator
 * can override by setting `section` itself, but this is the honest floor.
 */
export function sectionForBrdRequirement(text: string): string {
  const t = ` ${text.toLowerCase()} `
  for (const { key, words } of SECTION_SIGNALS) {
    if (words.some((w) => t.includes(w))) return key
  }
  return 'functional'
}

/** Count BRD requirements per section, for the narrative spread. */
function describeSpread(doc: BRD): string {
  const counts = new Map<string, number>()
  for (const r of doc.requirements) {
    const key = r.section || sectionForBrdRequirement(r.text)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const order = ['objectives', 'functional', 'nonfunctional', 'scope', 'stakeholders', 'assumptions']
  const singular: Record<string, string> = {
    objectives: 'business objective',
    functional: 'functional requirement',
    nonfunctional: 'non-functional requirement',
    scope: 'scope item',
    stakeholders: 'stakeholder note',
    assumptions: 'assumption/constraint',
  }
  const parts: string[] = []
  for (const k of order) {
    const c = counts.get(k)
    if (!c) continue
    parts.push(`${c} ${singular[k]}${c === 1 ? '' : 's'}`)
  }
  return parts.join(', ')
}

/** A plain-language "Trace's read" of a generated document. */
export function buildSummary(doc: BRD): string {
  const isBRD = !doc.parentId
  const type = (doc.type ?? (isBRD ? 'brd' : 'prd')) as DocumentTypeId
  const meta = DOCUMENT_TYPES[type] ?? DOCUMENT_TYPES.brd
  const n = doc.requirements.length
  const traced = doc.requirements.filter((r) => r.sourceQuote && r.sourceQuote.trim()).length

  if (isBRD) {
    const open = doc.conflicts.filter((c) => !c.resolved).length
    const spread = describeSpread(doc)
    const head = `A ${meta.name} with ${n} requirement${n === 1 ? '' : 's'} traced from the ingested source`
    const body = spread ? ` — ${spread}.` : '.'
    const tail =
      open > 0
        ? ` ${open} contradiction${open === 1 ? '' : 's'} still need${open === 1 ? 's' : ''} a decision before the BRD is complete.`
        : doc.complete
          ? ' Every requirement agrees and traces to a source quote, so the BRD is complete and downstream documents are unlocked.'
          : ` ${n - traced} requirement${n - traced === 1 ? '' : 's'} still lack a source quote, so the BRD is not yet complete.`
    return head + body + tail
  }

  const noun = type === 'stories' ? 'stories' : type === 'roadmap' ? 'milestones' : 'items'
  return `A ${meta.name} derived from the parent BRD. All ${n} ${n === 1 ? noun.replace(/s$/, '') : noun} trace one level up to a specific BRD requirement — ${traced}/${n} linked, no orphan ${noun}.`
}

/**
 * Turn a freshly generated document into a structured one: assign a framework
 * `section` to every requirement (unless the generator already set one) and
 * write the narrative `summary`. Pure — returns a new object.
 */
export function enrichGeneratedDoc(doc: BRD): BRD {
  const isBRD = !doc.parentId
  const type = (doc.type ?? (isBRD ? 'brd' : 'prd')) as DocumentTypeId
  const fallbackKey = primarySectionKey(type)
  const requirements = doc.requirements.map((r) =>
    r.section && r.section.trim()
      ? r
      : { ...r, section: isBRD ? sectionForBrdRequirement(r.text) : fallbackKey },
  )
  const next: BRD = { ...doc, requirements }
  next.summary = doc.summary && doc.summary.trim() ? doc.summary : buildSummary(next)
  return next
}

/** The default generator used by the server. Swap for an AI adapter later. */
export const defaultBrdGenerator: BrdGenerator = new RuleBasedBrdGenerator()
