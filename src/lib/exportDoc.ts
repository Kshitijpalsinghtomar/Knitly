/**
 * Portable Markdown export for the live document chain (root BRD or a downstream
 * PRD / Tech Spec / User Stories / Roadmap / Research doc).
 *
 * This is the payoff of a spec-integrity layer: when a generated document leaves
 * Trace — pasted into a PR description, Confluence, Notion, or committed to a
 * repo `/docs` folder — its PROVENANCE travels with it. Every BRD requirement
 * carries its verbatim source quote and attribution; every downstream item
 * carries the parent BRD requirement ids it derives from. The serializer emits
 * nothing the on-screen document doesn't already show, so the export is a
 * faithful, reviewable artifact rather than a lossy summary.
 *
 * `toMarkdown` is pure (no DOM) so it is unit-testable and safe to import in any
 * context; `downloadMarkdown` is the thin browser-only helper that turns its
 * output into a file download.
 */
import type { BRD, GeneratedRequirement, SourceConflict } from '../types'
import { DOCUMENT_FRAMEWORKS, DOCUMENT_TYPES, isDocumentTypeId, type DocumentTypeId } from './documentTypes'

/** Extra context the BRD object doesn't itself carry (human-readable titles). */
export interface ExportContext {
  /** For a BRD: the ingested source's title (BRD only stores `sourceId`). */
  sourceTitle?: string
  /** For a downstream doc: the parent BRD's title (doc only stores `parentId`). */
  parentTitle?: string
}

function typeId(doc: BRD): DocumentTypeId {
  return isDocumentTypeId(doc.type) ? doc.type : 'brd'
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
  } catch {
    return iso
  }
}

/** A filesystem-safe, readable file name for the exported document. */
export function exportFileName(doc: BRD): string {
  const slug =
    doc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'document'
  return `${slug}.${typeId(doc)}.md`
}

/** Render a source quote (possibly multi-line) as a single Markdown blockquote. */
function blockquote(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((line) => `> ${line}`.trimEnd())
    .join('\n')
}

function requirementSection(req: GeneratedRequirement, isBRD: boolean): string {
  const out: string[] = []
  out.push(`### ${req.id} — ${req.text.trim()}`)

  // Type-specific elaboration (Gherkin criteria, EARS pattern, roadmap phase…).
  if (req.detail && req.detail.trim()) {
    out.push('', '```', req.detail.trim(), '```')
  }

  const traced = !!(req.sourceQuote && req.sourceQuote.trim())
  out.push('')

  if (isBRD) {
    if (traced) {
      out.push(blockquote(req.sourceQuote))
      const attribution = [req.author, req.timestamp ? fmtDate(req.timestamp) : '']
        .filter(Boolean)
        .join(' · ')
      if (attribution) out.push(`>`, `> — ${attribution}`)
    } else {
      out.push('> ⚠️ **Untraced** — no verbatim source quote. Keeps the BRD incomplete.')
    }
  } else {
    const parents = (req.derivedFrom ?? []).filter(Boolean)
    out.push(`**Derives from:** ${parents.length ? parents.join(', ') : '—'}`)
    if (traced) {
      out.push('', blockquote(req.sourceQuote))
    }
  }

  return out.join('\n')
}

function conflictsSection(conflicts: SourceConflict[]): string {
  if (conflicts.length === 0) {
    return ['## Open decisions & conflicts', '', '_None — every requirement agrees. This BRD is complete._'].join('\n')
  }
  const out: string[] = ['## Open decisions & conflicts', '']
  for (const c of conflicts) {
    const box = c.resolved ? '[x]' : '[ ]'
    const between = [c.reqA, c.reqB].filter(Boolean).join(' ↔ ')
    out.push(`- ${box} **${c.id}** (${c.severity})${c.resolved ? ' · resolved' : ''} — ${c.title.trim()}`)
    if (between) out.push(`  - Between: ${between}`)
    if (c.desc && c.desc.trim()) out.push(`  - ${c.desc.trim()}`)
    if (c.fix && c.fix.trim()) out.push(`  - **Suggested fix:** ${c.fix.trim()}`)
  }
  return out.join('\n')
}

/**
 * Serialize a live document to Markdown, preserving its traceability. Works for
 * both a root BRD (requirement → verbatim source quote) and a downstream doc
 * (item → parent BRD requirement ids + the parent requirement text).
 */
export function toMarkdown(doc: BRD, ctx: ExportContext = {}): string {
  const id = typeId(doc)
  const meta = DOCUMENT_TYPES[id]
  const fw = DOCUMENT_FRAMEWORKS[id]
  const isBRD = !doc.parentId
  const tracedCount = doc.requirements.filter((r) => r.sourceQuote && r.sourceQuote.trim()).length
  const openConflicts = doc.conflicts.filter((c) => !c.resolved).length

  const parts: string[] = []

  // Title + provenance header (a Markdown blockquote so it renders as a callout).
  parts.push(`# ${doc.title.trim()}`)
  const header: string[] = [
    `**Framework** · ${fw.framework}`,
    `**Type** · ${meta.name} · ${doc.complete ? 'Complete ✓' : 'Incomplete'}`,
    isBRD
      ? `**Source** · ${ctx.sourceTitle || 'ingested transcript'}`
      : `**Derived from** · ${ctx.parentTitle || 'parent BRD'}`,
    `**Generated** · ${fmtDate(doc.createdAt)} · by Trace (spec-integrity layer)`,
  ]
  parts.push(header.map((l) => `> ${l}  `).join('\n'))

  if (doc.brief && doc.brief.trim()) {
    parts.push('## Brief', doc.brief.trim())
  }

  // Requirements / items.
  const heading = isBRD ? `## Requirements (${doc.requirements.length})` : `## ${meta.name} items (${doc.requirements.length})`
  parts.push(heading)
  if (doc.requirements.length === 0) {
    parts.push('_No items generated._')
  } else {
    for (const req of doc.requirements) parts.push(requirementSection(req, isBRD))
  }

  // Conflicts (BRD only — downstream docs are complete by construction).
  if (isBRD) parts.push(conflictsSection(doc.conflicts))

  // Traceability footer — restate the guarantee that makes this exportable.
  const footer = isBRD
    ? `${tracedCount}/${doc.requirements.length} requirements traced to a source quote · ${openConflicts} open conflict${openConflicts === 1 ? '' : 's'}. ${fw.traceRule}`
    : `Every item derives from a traced requirement in ${ctx.parentTitle || 'the parent BRD'}. ${fw.traceRule}`
  parts.push('---', `_${footer}_`)

  return parts.join('\n\n') + '\n'
}

/**
 * Browser-only: turn `toMarkdown(doc)` into a downloaded `.md` file. Returns the
 * generated Markdown so callers can also copy it. No-op-safe outside a browser.
 */
export function downloadMarkdown(doc: BRD, ctx: ExportContext = {}): string {
  const md = toMarkdown(doc, ctx)
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return md
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName(doc)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on the next tick so the click has committed the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return md
}

/**
 * Best-effort copy to clipboard with a legacy fallback for iframe/preview
 * contexts where the async Clipboard API is blocked. Resolves true on success.
 */
export async function copyMarkdown(doc: BRD, ctx: ExportContext = {}): Promise<boolean> {
  const md = toMarkdown(doc, ctx)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(md)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = md
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
