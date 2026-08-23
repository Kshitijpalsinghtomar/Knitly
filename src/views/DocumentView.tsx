import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { DOC_META } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { DocTag } from '../components/ui/DocTag'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'
import { computeCompleteness, sectionForBrdRequirement } from '../server/generator'
import { resolveConflict as apiResolveConflict } from '../lib/api'
import { downloadMarkdown, copyMarkdown } from '../lib/exportDoc'
import {
  docSections,
  primarySectionKey,
  isDocumentTypeId,
  DOCUMENT_FRAMEWORKS,
  type DocSection,
  type DocumentTypeId,
} from '../lib/documentTypes'
import type { DocMode, BRD, DocType, GeneratedRequirement } from '../types'

/**
 * The single, unified document viewer for the LIVE generated chain (a root BRD
 * plus any downstream PRD / Tech Spec / User Stories / Roadmap / Research docs).
 *
 * There used to be two viewers here: a rich, three-mode collaboration surface
 * that only ever rendered mock demo data, and a thin "extracted requirements"
 * panel that rendered the real generated doc as a flat list. Real documents fell
 * into the thin one, so the rich experience was unreachable for anything a user
 * actually generated. This file unifies them: the rich Brief / Full read / Review
 * modes now render the REAL active document, for every document type, wired to
 * real sections, the narrative summary, resolvable conflicts, provenance, a
 * working (session-local) collaboration surface, and Markdown export.
 *
 * Honesty over theatre: presence shows who is actually here (you, plus the
 * document's author), comments and section approvals are real session state, and
 * nothing is fabricated (no scripted "someone is typing"). When no document has
 * been generated yet, we show a clean empty state that points at the generator
 * rather than a confusing mock demo.
 */

// ─── Small primitives ─────────────────────────────────────────────────────────
// Live documents carry their author as a NAME string (not a team uid), so the
// uid-based <Avatar> can't render them. This deterministic initials badge does.
const BADGE_COLORS = ['#5B8DEF', '#4EAD79', '#9B6FE8', '#E05F6A', '#E0823A', '#F5A623']
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function InitialBadge({ name, size = 22 }: { name: string; size?: number }) {
  const color = BADGE_COLORS[hashStr(name) % BADGE_COLORS.length]
  return (
    <div
      title={name}
      style={st({
        width: size, height: size, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0,
      })}
    >
      {initialsOf(name)}
    </div>
  )
}

// ─── Pure view-model helpers ──────────────────────────────────────────────────
function typeOf(doc: BRD): DocumentTypeId {
  return isDocumentTypeId(doc.type) ? doc.type : doc.parentId ? 'prd' : 'brd'
}

/** Fallback narrative when a document predates server-side summaries. */
function readSummary(doc: BRD): string {
  if (doc.summary && doc.summary.trim()) return doc.summary
  const isBRD = !doc.parentId
  const n = doc.requirements.length
  const traced = doc.requirements.filter((r) => r.sourceQuote && r.sourceQuote.trim()).length
  if (isBRD) {
    const open = doc.conflicts.filter((c) => !c.resolved).length
    return `${n} requirement${n === 1 ? '' : 's'} extracted from the source · ${traced}/${n} traced · ${open} open conflict${open === 1 ? '' : 's'}.`
  }
  return `${n} item${n === 1 ? '' : 's'} derived from the parent BRD · ${traced}/${n} linked to a parent requirement.`
}

type Group = { section: DocSection; items: GeneratedRequirement[] }

/**
 * Group a document's flat requirements into its framework sections. Uses the
 * persisted `section` when present; otherwise classifies BRD requirements with
 * the shared server classifier and drops downstream items into the type's single
 * primary bucket. Empty sections are hidden; unknown keys are appended so nothing
 * is ever silently lost.
 */
function groupBySection(doc: BRD): Group[] {
  const type = typeOf(doc)
  const isBRD = !doc.parentId
  const fallback = primarySectionKey(type)
  const buckets = new Map<string, GeneratedRequirement[]>()
  for (const r of doc.requirements) {
    const key = r.section && r.section.trim() ? r.section : isBRD ? sectionForBrdRequirement(r.text) : fallback
    const arr = buckets.get(key) ?? []
    arr.push(r)
    buckets.set(key, arr)
  }
  const schema = docSections(type)
  const known: Group[] = schema
    .map((s) => ({ section: s, items: buckets.get(s.key) ?? [] }))
    .filter((g) => g.items.length > 0)
  const knownKeys = new Set(schema.map((s) => s.key))
  const extras: Group[] = []
  for (const [key, items] of buckets) {
    if (!knownKeys.has(key)) extras.push({ section: { key, label: key }, items })
  }
  return [...known, ...extras]
}

const DOWNSTREAM_TYPES: DocType[] = ['prd', 'spec', 'stories', 'roadmap', 'research']

// ─── Local collaboration state ────────────────────────────────────────────────
type LocalComment = { id: string; docId: string; sectionKey: string; text: string; at: string }
type ReviewState = Record<string, 'approved' | 'changes' | undefined>

// ─── Requirement row (full detail, used in Read mode) ─────────────────────────
function RequirementRow({
  req, isBRD, accent, expanded, onToggle, onJumpParent, highlight, onDrill,
}: {
  req: GeneratedRequirement
  isBRD: boolean
  accent: string
  expanded: boolean
  onToggle: () => void
  onJumpParent: (pid: string) => void
  highlight: boolean
  onDrill?: () => void
}) {
  const traced = !!(req.sourceQuote && req.sourceQuote.trim())
  return (
    <div
      style={st({
        padding: highlight ? '12px 14px' : '12px 0',
        borderTop: '1px solid var(--bd)',
        background: highlight ? 'var(--sf)' : 'transparent',
        borderRadius: highlight ? 10 : 0,
        margin: highlight ? '4px -14px' : 0,
        transition: 'background 150ms',
      })}
    >
      <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 12 })}>
        <span className="mono" style={st({ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: accent, fontWeight: 700, flexShrink: 0, paddingTop: 2 })}>
          {req.id}
        </span>
        <div style={st({ flex: 1, minWidth: 0 })}>
          <div style={st({ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.6 })}>{req.text}</div>
          {req.detail && (
            <div className="mono" style={st({ marginTop: 7, padding: '8px 11px', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8, fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' })}>
              {req.detail}
            </div>
          )}
          <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
            <span style={st({ fontSize: 11, color: 'var(--t3)' })}>by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{req.author}</strong></span>
            {traced ? (
              <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ok)', background: 'rgba(78,173,121,0.12)', padding: '1px 7px', borderRadius: 100 })}>traced</span>
            ) : (
              <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--err)', background: 'rgba(224,95,106,0.12)', padding: '1px 7px', borderRadius: 100 })}>unlinked</span>
            )}
            {isBRD && req.conflicts.length > 0 && (
              <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--err)', background: 'rgba(224,95,106,0.12)', padding: '1px 7px', borderRadius: 100 })}>conflict</span>
            )}
            {!isBRD && (req.derivedFrom ?? []).map((pid) => (
              <button key={pid} onClick={() => onJumpParent(pid)} className="mono"
                style={st({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'var(--ac)', fontWeight: 700, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' })}>
                ← {pid}
              </button>
            ))}
            {traced && (
              <button onClick={onToggle}
                style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ac)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 3 })}>
                {isBRD ? 'source quote' : 'derives from'} <Ico n={expanded ? 'chevron-d' : 'chevron-r'} s={10} c="currentColor" />
              </button>
            )}
            {onDrill && (
              <button onClick={onDrill} title="Open the full Source → Design → Code trace"
                style={st({ marginLeft: traced ? 0 : 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ac)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 })}>
                <Ico n="shield" s={10} c="currentColor" /> Trace
              </button>
            )}
          </div>
          {expanded && traced && (
            <blockquote style={st({ margin: '10px 0 0', padding: '10px 14px', background: 'var(--sf)', borderLeft: `3px solid ${accent}`, borderRadius: 8, fontSize: 12.5, fontStyle: 'italic', color: 'var(--t2)', lineHeight: 1.6 })}>
              {!isBRD && (
                <div style={st({ fontStyle: 'normal', fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 })}>
                  Parent requirement {(req.derivedFrom ?? [])[0] || ''}
                </div>
              )}
              {req.sourceQuote}
            </blockquote>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state (no live document yet) ───────────────────────────────────────
function EmptyState() {
  const { setGenOpen } = useApp()
  return (
    <div style={st({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 40 })}>
      <div style={st({ maxWidth: 440, textAlign: 'center' })}>
        <div style={st({ display: 'flex', justifyContent: 'center', marginBottom: 18 })}>
          <Trace size={48} mood="wave" />
        </div>
        <h1 className="bri" style={st({ fontSize: 24, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.04em', margin: '0 0 10px' })}>
          No document yet
        </h1>
        <p style={st({ fontSize: 14, color: 'var(--t2)', lineHeight: 1.65, margin: '0 0 22px' })}>
          Generate a BRD from a transcript to start the chain. Every requirement stays traced to a verbatim
          source quote, contradictions are flagged, and only once the BRD is complete do the downstream
          documents — PRD, Tech Spec, User Stories, Roadmap, Research — unlock.
        </p>
        <Btn v="primary" onClick={() => setGenOpen(true)}>
          <Ico n="sparkle" s={13} c="#0F0F0E" /> Generate a document
        </Btn>
      </div>
    </div>
  )
}

// ─── Main unified live viewer ─────────────────────────────────────────────────
function LiveDocViewer() {
  const {
    liveSource, liveBRD, downstreamDocs, activeDoc, setActiveDocId,
    upsertLiveDoc, updateLiveDoc, setView, setGenOpen, setGenPreset,
    activeReqId, setActiveReqId,
  } = useApp()

  const [mode, setMode] = useState<DocMode>('brief')
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [openConflict, setOpenConflict] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [comments, setComments] = useState<LocalComment[]>([])
  const [reviews, setReviews] = useState<ReviewState>({})
  const [commentDraft, setCommentDraft] = useState('')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'threads' | 'review' | 'chain'>('threads')
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'traced' | 'unlinked' | 'conflicts'>('all')
  const [query, setQuery] = useState('')

  const doc = activeDoc as BRD
  const isBRD = !doc.parentId
  const type = typeOf(doc)
  const meta = DOC_META[doc.type ?? 'brd']
  const fw = DOCUMENT_FRAMEWORKS[type]
  const complete = doc.complete
  const openConflicts = doc.conflicts.filter((c) => !c.resolved)
  const tracedCount = doc.requirements.filter((r) => r.sourceQuote && r.sourceQuote.trim()).length
  const coveragePct = doc.requirements.length ? Math.round((tracedCount / doc.requirements.length) * 100) : 0
  const groups = useMemo(() => groupBySection(doc), [doc])
  const chain: BRD[] = liveBRD ? [liveBRD, ...downstreamDocs] : downstreamDocs
  const existingTypes = new Set(downstreamDocs.map((d) => d.type))

  // Read-mode filtering: a text query plus a coverage lens (all / traced /
  // unlinked / in-conflict). Empty sections drop out so the read stays tight.
  const q = query.trim().toLowerCase()
  const matchReq = (r: GeneratedRequirement) => {
    if (q) {
      const hay = `${r.id} ${r.text} ${r.sourceQuote ?? ''} ${r.detail ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    const traced = !!(r.sourceQuote && r.sourceQuote.trim())
    if (filter === 'traced') return traced
    if (filter === 'unlinked') return !traced
    if (filter === 'conflicts') return r.conflicts.length > 0
    return true
  }
  const filteredGroups = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter(matchReq) })).filter((g) => g.items.length > 0),
    [groups, filter, q],
  )
  const shownCount = filteredGroups.reduce((n, g) => n + g.items.length, 0)
  const conflictReqCount = doc.requirements.filter((r) => r.conflicts.length > 0).length

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1800) }
  const exportCtx = { sourceTitle: liveSource?.title, parentTitle: liveBRD?.title }
  const onExport = () => { downloadMarkdown(doc, exportCtx); flash('Downloaded Markdown') }
  const onCopy = async () => { const ok = await copyMarkdown(doc, exportCtx); flash(ok ? 'Copied Markdown' : 'Copy blocked — try Export') }

  // Durable conflict resolution: persist via API, reflect the server-recomputed
  // doc; fall back to a local recompute so the UI still responds when offline.
  const setConflict = async (id: string, resolved: boolean) => {
    setResolving(id)
    try {
      const updated = await apiResolveConflict(doc.id, id, resolved)
      upsertLiveDoc(updated)
    } catch {
      updateLiveDoc(doc.id, (prev) => {
        const conflicts = prev.conflicts.map((c) => (c.id === id ? { ...c, resolved } : c))
        const next: BRD = { ...prev, conflicts }
        next.complete = computeCompleteness(next)
        return next
      })
    } finally {
      setResolving(null)
    }
  }

  const startDownstream = (t: DocType) => { setGenPreset(t); setGenOpen(true) }
  const backToBRD = () => { if (liveBRD) setActiveDocId(liveBRD.id) }

  // Jump from a downstream item to its parent requirement in the BRD: switch to
  // the BRD, remember the requirement, open Full read, and highlight it there.
  const jumpToParent = (pid: string) => {
    if (liveBRD) setActiveDocId(liveBRD.id)
    setActiveReqId(pid)
    setMode('read')
  }

  // Open + scroll a section into view within Full read (used by the TOC rail and
  // by conflict requirement chips).
  const scrollToSection = (key: string) => {
    setMode('read')
    setOpenSections((p) => ({ ...p, [key]: true }))
    setTimeout(() => {
      document.getElementById(`${doc.id}-sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }
  // Drill into a BRD requirement's full Source → Design → Code trace page.
  const drillToReq = (id: string) => { setActiveReqId(id); setView('requirement') }
  // Highlight a requirement inside the current doc (from a conflict chip).
  const jumpToReqInDoc = (id: string) => {
    setActiveReqId(id)
    const g = groups.find((gr) => gr.items.some((r) => r.id === id))
    if (g) scrollToSection(g.section.key)
    else setMode('read')
  }
  const setAllSections = (open: boolean) =>
    setOpenSections(Object.fromEntries(groups.map((g) => [g.section.key, open])))

  const aKey = (sk: string) => `${doc.id}::${sk}`
  const commentsFor = (sk: string) => comments.filter((c) => c.docId === doc.id && c.sectionKey === sk)
  const addComment = (sk: string) => {
    const text = commentDraft.trim()
    if (!text) return
    setComments((p) => [...p, { id: `c${p.length + 1}-${hashStr(text + sk)}`, docId: doc.id, sectionKey: sk, text, at: 'just now' }])
    setCommentDraft('')
  }
  const setReview = (sk: string, v: 'approved' | 'changes') =>
    setReviews((r) => ({ ...r, [aKey(sk)]: r[aKey(sk)] === v ? undefined : v }))

  const badgeLabel = `LIVE · ${(meta.label || 'DOC').toUpperCase()}`

  // Which section (if any) holds the requirement we jumped to.
  const activeReqSection = useMemo(() => {
    if (!activeReqId) return null
    for (const g of groups) if (g.items.some((r) => r.id === activeReqId)) return g.section.key
    return null
  }, [groups, activeReqId])

  const isSectionOpen = (key: string, index: number) =>
    openSections[key] ?? (index === 0 || key === activeReqSection)

  // ── Shared header (identity, provenance, stats, chain, gate) ──
  const renderHeader = () => (
    <div style={st({ padding: '28px 40px 20px', borderBottom: '1px solid var(--bd)' })}>
      <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 })}>
        <div style={st({ minWidth: 0, flex: 1 })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' })}>
            <span style={st({ fontSize: 9, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.07em' })}>{badgeLabel}</span>
            <DocTag type={doc.type ?? 'brd'} />
            <span className="mono" style={st({ fontSize: 10, color: 'var(--t3)' })}>{fw.frameworkTag}</span>
          </div>
          <h1 className="bri" style={st({ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.045em', lineHeight: 1.15, margin: '0 0 12px', maxWidth: 640 })}>
            {doc.title}
          </h1>
          <div style={st({ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' })}>
            {isBRD ? (
              <span>Source: <strong style={st({ fontWeight: 600 })}>{liveSource?.title || 'ingested transcript'}</strong></span>
            ) : (
              <span>Derived from: <strong style={st({ fontWeight: 600 })}>{liveBRD?.title || 'BRD'}</strong></span>
            )}
            <span style={st({ color: 'var(--bd2)' })}>·</span>
            <span>by {doc.author}</span>
            <span style={st({ color: 'var(--bd2)' })}>·</span>
            <span>{new Date(doc.createdAt).toLocaleString()}</span>
          </div>
          {/* Mini stats */}
          <div style={st({ display: 'flex', gap: 24, marginTop: 16 })}>
            <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800 })}>{doc.requirements.length}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>{isBRD ? 'requirements' : 'items'}</div></div>
            {isBRD && <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800, color: openConflicts.length > 0 ? 'var(--err)' : 'var(--ok)' })}>{openConflicts.length}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>open conflicts</div></div>}
            <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800, color: 'var(--ok)' })}>{tracedCount}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>traced</div></div>
            <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800 })}>{groups.length}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>sections</div></div>
          </div>
          {/* Traceability coverage — the completeness gate, made legible */}
          <div style={st({ marginTop: 18, maxWidth: 460 })}>
            <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 })}>
              <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' })}>Traceability coverage</span>
              <span className="mono" style={st({ fontSize: 11, fontWeight: 700, color: coveragePct === 100 ? 'var(--ok)' : 'var(--warn)' })}>{coveragePct}%</span>
            </div>
            <div style={st({ height: 6, borderRadius: 100, background: 'var(--bd)', overflow: 'hidden', display: 'flex' })}>
              <div style={st({ height: '100%', width: `${coveragePct}%`, background: coveragePct === 100 ? 'var(--ok)' : 'var(--ac)', borderRadius: 100, transition: 'width 300ms' })} />
            </div>
            <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 6, lineHeight: 1.5 })}>
              {tracedCount}/{doc.requirements.length} {isBRD ? 'requirements traced to a source quote' : 'items linked to a parent requirement'}
              {isBRD && openConflicts.length > 0 ? ` · ${openConflicts.length} open conflict${openConflicts.length === 1 ? '' : 's'} blocking completion` : ''}
            </div>
          </div>
        </div>
        {/* Gate card */}
        <div style={st({ flexShrink: 0, width: 248, padding: 16, borderRadius: 14, background: 'var(--sf)', border: `1.5px solid ${complete ? 'var(--ok)' : 'var(--bd2)'}` })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 })}>
            <div style={st({ width: 8, height: 8, borderRadius: '50%', background: complete ? 'var(--ok)' : 'var(--warn)', flexShrink: 0 })} />
            <span style={st({ fontSize: 12, fontWeight: 700, color: complete ? 'var(--ok)' : 'var(--warn)' })}>
              {meta.label} {complete ? 'Complete' : 'Incomplete'}
            </span>
          </div>
          {isBRD ? (
            <>
              <p style={st({ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5, margin: '0 0 10px' })}>
                Requires every requirement traced to a source quote and no open conflicts ({openConflicts.length} open).
              </p>
              {complete ? (
                <>
                  <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '2px 0 7px' })}>Generate downstream</div>
                  <div style={st({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 })}>
                    {DOWNSTREAM_TYPES.map((t) => {
                      const made = existingTypes.has(t)
                      return (
                        <button key={t} onClick={() => startDownstream(t)}
                          style={st({ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' })}>
                          <Ico n={DOC_META[t].icon as any} s={12} c={DOC_META[t].color} />
                          <span style={st({ fontSize: 11, fontWeight: 600, color: 'var(--t1)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}>{DOC_META[t].label}</span>
                          {made && <Ico n="check" s={10} c="var(--ok)" />}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p style={st({ fontSize: 10.5, color: 'var(--t3)', margin: '7px 0 0' })}>Downstream docs are gated until this BRD is complete.</p>
              )}
            </>
          ) : (
            <>
              <p style={st({ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5, margin: '0 0 10px' })}>
                Every item traces one level up to a parent BRD requirement — no orphan items.
              </p>
              <Btn v="ghost" sm onClick={backToBRD}><Ico n="arrow-l" s={12} c="var(--t2)" /> Back to BRD</Btn>
            </>
          )}
        </div>
      </div>

      {/* Chain navigation */}
      {chain.length > 1 && (
        <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18, flexWrap: 'wrap' })}>
          {chain.map((t) => {
            const active = t.id === doc.id
            const tm = DOC_META[t.type ?? 'brd']
            return (
              <button key={t.id} onClick={() => setActiveDocId(t.id)}
                style={st({ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: active ? `${tm.color}1A` : 'var(--sf)', border: `1.5px solid ${active ? tm.color : 'var(--bd)'}`, cursor: 'pointer', fontFamily: 'inherit' })}>
                <Ico n={tm.icon as any} s={12} c={tm.color} />
                <span style={st({ fontSize: 12, fontWeight: 600, color: active ? tm.color : 'var(--t2)' })}>{tm.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Trace's read (narrative summary) ──
  const renderTraceRead = () => (
    <div style={st({ paddingLeft: 16, borderLeft: '2px solid var(--ai)' })}>
      <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 })}>
        <Trace size={16} mood={complete ? 'done' : 'thinking'} />
        <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>{"Trace's read"}</span>
      </div>
      <p style={st({ fontSize: 15, color: 'var(--t1)', lineHeight: 1.7, margin: 0 })}>{readSummary(doc)}</p>
    </div>
  )

  // ── BRIEF MODE ──
  const renderBrief = () => (
    <div style={st({ display: 'grid', gridTemplateColumns: '1fr 290px' })}>
      <div style={st({ padding: '28px 40px 60px', borderRight: '1px solid var(--bd)' })}>
        <div style={st({ marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid var(--bd)' })}>{renderTraceRead()}</div>

        {isBRD && openConflicts.length > 0 && (
          <div style={st({ marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid var(--bd)', paddingLeft: 16, borderLeft: '2px solid var(--err)' })}>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--err)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Needs a decision before complete</div>
            <div style={st({ display: 'flex', flexDirection: 'column', gap: 8 })}>
              {openConflicts.slice(0, 3).map((c) => (
                <div key={c.id} style={st({ display: 'flex', alignItems: 'baseline', gap: 10 })}>
                  <span className="mono" style={st({ fontSize: 10, color: c.severity === 'major' ? 'var(--err)' : 'var(--t3)', fontWeight: 700, flexShrink: 0 })}>{c.id}</span>
                  <span style={st({ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 })}>{c.title}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setMode('act')}
              style={st({ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--err)', fontWeight: 600, fontFamily: 'inherit', padding: 0 })}>
              Resolve {openConflicts.length} conflict{openConflicts.length === 1 ? '' : 's'} →
            </button>
          </div>
        )}

        {/* Section overview */}
        <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 })}>
          <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Document outline</span>
          <button onClick={() => setMode('read')} style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ac)', fontWeight: 600, fontFamily: 'inherit', padding: 0 })}>
            Full read →
          </button>
        </div>
        {groups.map((g) => (
          <div key={g.section.key} style={st({ marginBottom: 20 })}>
            <div style={st({ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 })}>
              <span className="bri" style={st({ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' })}>{g.section.label}</span>
              <span className="mono" style={st({ fontSize: 10, color: 'var(--t3)' })}>{g.items.length}</span>
            </div>
            {g.items.slice(0, 3).map((r) => (
              <div key={r.id} style={st({ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0' })}>
                <span className="mono" style={st({ fontSize: 10, color: meta.color, fontWeight: 700, flexShrink: 0 })}>{r.id}</span>
                <span style={st({ fontSize: 13, color: 'var(--t2)', lineHeight: 1.55 })}>{r.text}</span>
              </div>
            ))}
            {g.items.length > 3 && (
              <button onClick={() => setMode('read')} style={st({ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--t3)', fontFamily: 'inherit', padding: 0 })}>
                +{g.items.length - 3} more in full read
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Right rail */}
      <div style={st({ padding: '28px 22px 60px' })}>
        <div style={st({ marginBottom: 30 })}>
          <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Provenance</div>
          <p style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, margin: 0 })}>{fw.traceRule}</p>
        </div>
        <div style={st({ marginBottom: 30 })}>
          <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>People here</div>
          <div style={st({ display: 'flex', flexDirection: 'column', gap: 10 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
              <InitialBadge name="You" size={24} />
              <div style={st({ flex: 1 })}><div style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)' })}>You</div><div style={st({ fontSize: 11, color: 'var(--t3)' })}>viewing now</div></div>
              <div style={st({ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0 })} />
            </div>
            {doc.author && doc.author !== 'You' && (
              <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
                <InitialBadge name={doc.author} size={24} />
                <div style={st({ flex: 1 })}><div style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)' })}>{doc.author}</div><div style={st({ fontSize: 11, color: 'var(--t3)' })}>author</div></div>
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Quick actions</div>
          <div style={st({ display: 'flex', flexDirection: 'column', gap: 5 })}>
            <Btn v="ghost" sm onClick={() => setMode('read')}><Ico n="book" s={12} c="var(--t2)" /> Full read</Btn>
            <Btn v="ghost" sm onClick={() => setMode('act')}><Ico n="comment" s={12} c="var(--t2)" /> Review &amp; collaborate</Btn>
            <Btn v="ghost" sm onClick={onExport}><Ico n="download" s={12} c="var(--t2)" /> Export Markdown</Btn>
            <Btn v="ghost" sm onClick={onCopy}><Ico n="copy" s={12} c="var(--t2)" /> Copy Markdown</Btn>
          </div>
        </div>
      </div>
    </div>
  )

  // ── FULL READ MODE ──
  const renderRead = () => {
    const forceOpen = !!q || filter !== 'all'
    const allOpen = groups.length > 0 && groups.every((g) => openSections[g.section.key] === true)
    const FILTERS: [typeof filter, string, number][] = [
      ['all', 'All', doc.requirements.length],
      ['traced', 'Traced', tracedCount],
      ['unlinked', 'Unlinked', doc.requirements.length - tracedCount],
      ...(isBRD ? ([['conflicts', 'In conflict', conflictReqCount]] as [typeof filter, string, number][]) : []),
    ]
    return (
      <div style={st({ display: 'grid', gridTemplateColumns: '1fr 260px' })}>
        <div style={st({ padding: '32px 48px 80px', borderRight: '1px solid var(--bd)' })}>
          <div style={st({ maxWidth: 720 })}>
            <div style={st({ marginBottom: 24 })}>{renderTraceRead()}</div>
            {doc.brief && doc.brief.trim() && (
              <div style={st({ marginBottom: 24, padding: '12px 16px', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 10 })}>
                <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 })}>Brief</div>
                <p style={st({ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.7, margin: 0 })}>{doc.brief}</p>
              </div>
            )}

            {/* Filter + search — sticky so the lens stays reachable while reading */}
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap', position: 'sticky', top: 0, background: 'var(--bg)', paddingTop: 4, paddingBottom: 10, zIndex: 5 })}>
              <div style={st({ display: 'flex', gap: 4, flexWrap: 'wrap' })}>
                {FILTERS.map(([f, label, count]) => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={st({ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, border: `1px solid ${filter === f ? 'var(--ac)' : 'var(--bd)'}`, background: filter === f ? 'var(--acd)' : 'transparent', color: filter === f ? 'var(--ac)' : 'var(--t2)', cursor: 'pointer', fontSize: 11.5, fontWeight: filter === f ? 600 : 500, fontFamily: 'inherit' })}>
                    {label}<span className="mono" style={st({ fontSize: 10, opacity: 0.7 })}>{count}</span>
                  </button>
                ))}
              </div>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 150, marginLeft: 'auto', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8, padding: '5px 10px' })}>
                <Ico n="search" s={12} c="var(--t3)" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requirements…"
                  style={st({ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12.5, color: 'var(--t1)', fontFamily: 'inherit', minWidth: 0 })} />
                {query && (
                  <button onClick={() => setQuery('')} style={st({ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--t3)', display: 'flex' })}>
                    <Ico n="close" s={11} c="currentColor" />
                  </button>
                )}
              </div>
            </div>
            {forceOpen && (
              <div style={st({ fontSize: 11.5, color: 'var(--t3)', margin: '-6px 0 14px' })}>
                Showing {shownCount} of {doc.requirements.length} ·{' '}
                <button onClick={() => { setFilter('all'); setQuery('') }} style={st({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ac)', fontFamily: 'inherit', fontSize: 11.5 })}>clear</button>
              </div>
            )}

            {filteredGroups.length === 0 ? (
              <div style={st({ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13, border: '1px dashed var(--bd)', borderRadius: 12 })}>
                No requirements match.{' '}
                <button onClick={() => { setFilter('all'); setQuery('') }} style={st({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ac)', fontFamily: 'inherit', fontSize: 13 })}>Clear filters</button>
              </div>
            ) : filteredGroups.map((g, gi) => {
              const isOpen = forceOpen ? true : isSectionOpen(g.section.key, gi)
              return (
                <div key={g.section.key} id={`${doc.id}-sec-${g.section.key}`} style={st({ marginBottom: 4, scrollMarginTop: 12 })}>
                  <button onClick={() => setOpenSections((p) => ({ ...p, [g.section.key]: !isOpen }))}
                    style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', borderBottom: isOpen ? 'none' : '1px solid var(--bd)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' })}>
                    <span className="bri" style={st({ fontSize: 15, fontWeight: 700, color: 'var(--t1)', flex: 1, letterSpacing: '-0.02em' })}>{g.section.label}</span>
                    <span className="mono" style={st({ fontSize: 10, color: 'var(--t3)' })}>{g.items.length}</span>
                    <Ico n={isOpen ? 'chevron-d' : 'chevron-r'} s={11} c="var(--t3)" />
                  </button>
                  {isOpen && (
                    <div style={st({ padding: '4px 0 20px 22px', borderBottom: '1px solid var(--bd)', borderLeft: `2px solid ${meta.color}`, marginLeft: 8 })}>
                      {g.section.hint && (
                        <p style={st({ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, margin: '10px 0 4px', fontStyle: 'italic' })}>{g.section.hint}</p>
                      )}
                      {g.items.map((r) => (
                        <RequirementRow
                          key={r.id}
                          req={r}
                          isBRD={isBRD}
                          accent={meta.color}
                          expanded={!!expandedReqs[r.id] || r.id === activeReqId}
                          onToggle={() => setExpandedReqs((p) => ({ ...p, [r.id]: !p[r.id] }))}
                          onJumpParent={jumpToParent}
                          onDrill={isBRD ? () => drillToReq(r.id) : undefined}
                          highlight={r.id === activeReqId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {isBRD && (
              <div id={`${doc.id}-sec-__conflicts`} style={st({ marginTop: 32, scrollMarginTop: 12 })}>
                <h2 className="bri" style={st({ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em', margin: '0 0 12px' })}>Open decisions &amp; conflicts</h2>
                {doc.conflicts.length === 0 ? (
                  <div style={st({ padding: 12, background: 'rgba(78,173,121,0.08)', border: '1px solid rgba(78,173,121,0.25)', borderRadius: 10, fontSize: 12.5, color: 'var(--ok)' })}>
                    No conflicts — every requirement agrees. This BRD is complete.
                  </div>
                ) : (
                  doc.conflicts.map((c) => (
                    <div key={c.id} style={st({ padding: 14, borderRadius: 12, border: `1px solid ${c.resolved ? 'var(--bd)' : 'var(--bd2)'}`, background: 'var(--sf)', marginBottom: 10, opacity: c.resolved ? 0.62 : 1 })}>
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 })}>
                        <span className="mono" style={st({ fontSize: 10, color: c.severity === 'major' ? 'var(--err)' : 'var(--warn)', fontWeight: 700 })}>{c.id}</span>
                        <span style={st({ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.severity === 'major' ? 'var(--err)' : 'var(--warn)', background: c.severity === 'major' ? 'rgba(224,95,106,0.12)' : 'rgba(230,163,60,0.14)', padding: '1px 6px', borderRadius: 100 })}>{c.severity}</span>
                        <span style={st({ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' })}>{c.title}</span>
                        {c.resolved ? (
                          <div style={st({ display: 'flex', alignItems: 'center', gap: 8 })}>
                            <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 3 })}><Ico n="check" s={10} c="var(--ok)" /> resolved</span>
                            <button onClick={() => setConflict(c.id, false)} disabled={resolving === c.id}
                              style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px', padding: 0 })}>
                              {resolving === c.id ? '…' : 'unresolve'}
                            </button>
                          </div>
                        ) : (
                          <Btn sm v="primary" disabled={resolving === c.id} onClick={() => setConflict(c.id, true)}>{resolving === c.id ? 'Saving…' : 'Resolve'}</Btn>
                        )}
                      </div>
                      <p style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, margin: '0 0 10px' })}>{c.desc}</p>
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: c.fix ? 10 : 0 })}>
                        <span style={st({ fontSize: 10, color: 'var(--t3)' })}>between</span>
                        {[c.reqA, c.reqB].filter(Boolean).map((rid) => (
                          <button key={rid} onClick={() => jumpToReqInDoc(rid)} className="mono"
                            style={st({ background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: 'var(--ac)', fontWeight: 700 })}>
                            {rid}
                          </button>
                        ))}
                      </div>
                      {c.fix && (
                        <div style={st({ display: 'flex', gap: 8, padding: '8px 11px', background: 'rgba(78,173,121,0.08)', border: '1px solid rgba(78,173,121,0.2)', borderRadius: 8 })}>
                          <Ico n="sparkle" s={12} c="var(--ok)" />
                          <div>
                            <span style={st({ fontSize: 9.5, fontWeight: 700, color: 'var(--ok)', letterSpacing: '0.06em', textTransform: 'uppercase' })}>Suggested fix</span>
                            <p style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.55, margin: '2px 0 0' })}>{c.fix}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right rail: on-this-page TOC + framework + provenance + export */}
        <div style={st({ padding: '32px 20px 60px' })}>
          <div style={st({ marginBottom: 26, position: 'sticky', top: 12 })}>
            <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 })}>
              <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>On this page</div>
              <button onClick={() => setAllSections(!allOpen)} style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, color: 'var(--ac)', fontFamily: 'inherit', padding: 0 })}>
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
            <div style={st({ display: 'flex', flexDirection: 'column', gap: 2 })}>
              {groups.map((g) => (
                <button key={g.section.key} onClick={() => scrollToSection(g.section.key)}
                  style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, background: g.section.key === activeReqSection ? 'var(--acd)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' })}>
                  <span style={st({ width: 4, height: 4, borderRadius: '50%', background: meta.color, flexShrink: 0 })} />
                  <span style={st({ fontSize: 12, color: 'var(--t2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}>{g.section.label}</span>
                  <span className="mono" style={st({ fontSize: 10, color: 'var(--t3)' })}>{g.items.length}</span>
                </button>
              ))}
              {isBRD && doc.conflicts.length > 0 && (
                <button onClick={() => scrollToSection('__conflicts')}
                  style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' })}>
                  <span style={st({ width: 4, height: 4, borderRadius: '50%', background: openConflicts.length ? 'var(--err)' : 'var(--ok)', flexShrink: 0 })} />
                  <span style={st({ fontSize: 12, color: 'var(--t2)', flex: 1 })}>Conflicts</span>
                  <span className="mono" style={st({ fontSize: 10, color: openConflicts.length ? 'var(--err)' : 'var(--t3)' })}>{openConflicts.length || doc.conflicts.length}</span>
                </button>
              )}
            </div>
          </div>
          <div style={st({ marginBottom: 26 })}>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Framework</div>
            <div style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 })}>{fw.framework}</div>
            <p style={st({ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, margin: 0 })}>{fw.traceRule}</p>
          </div>
          <div style={st({ marginBottom: 26 })}>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>{isBRD ? 'Built from' : 'Derived from'}</div>
            <div style={st({ display: 'flex', gap: 10, alignItems: 'flex-start' })}>
              <Ico n={isBRD ? 'doc' : (DOC_META.brd.icon as any)} s={13} c={isBRD ? 'var(--t2)' : DOC_META.brd.color} />
              <div>
                <div style={st({ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' })}>{isBRD ? (liveSource?.title || 'ingested transcript') : (liveBRD?.title || 'parent BRD')}</div>
                <div className="mono" style={st({ fontSize: 10.5, color: 'var(--t3)', marginTop: 1 })}>{tracedCount}/{doc.requirements.length} traced</div>
              </div>
            </div>
          </div>
          <div>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 })}>Export</div>
            <div style={st({ display: 'flex', flexDirection: 'column', gap: 5 })}>
              <Btn v="ghost" sm onClick={onExport}><Ico n="download" s={12} c="var(--t2)" /> Download .md</Btn>
              <Btn v="ghost" sm onClick={onCopy}><Ico n="copy" s={12} c="var(--t2)" /> Copy Markdown</Btn>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── REVIEW / COLLABORATE MODE ──
  const renderReview = () => {
    const selGroup = groups.find((g) => g.section.key === selectedSection) || null
    const openThreads = comments.filter((c) => c.docId === doc.id)
    return (
      <div style={st({ display: 'grid', gridTemplateColumns: '1fr 300px', alignItems: 'start' })}>
        {/* Document with selectable sections */}
        <div style={st({ padding: '24px 36px 60px', borderRight: '1px solid var(--bd)' })}>
          <div style={st({ display: 'flex', gap: 12, padding: '12px 16px', borderLeft: '2px solid var(--ai)', marginBottom: 24 })}>
            <Trace size={24} mood={complete ? 'done' : 'thinking'} />
            <div style={st({ flex: 1 })}>
              <p style={st({ fontSize: 13, fontWeight: 700, color: complete ? 'var(--ok)' : 'var(--ai)', margin: '0 0 3px' })}>
                {complete ? 'This document is complete and traceable.' : `${openConflicts.length} decision${openConflicts.length === 1 ? '' : 's'} still open.`}
              </p>
              <p style={st({ fontSize: 12.5, color: 'var(--t2)', margin: 0, lineHeight: 1.6 })}>
                Click a section to comment or record an approval. Everything here is your session review.
              </p>
            </div>
          </div>

          {groups.map((g) => {
            const selected = selectedSection === g.section.key
            const threadCount = commentsFor(g.section.key).length
            const rev = reviews[aKey(g.section.key)]
            return (
              <div key={g.section.key}
                style={st({ marginBottom: 22, cursor: 'pointer' })}
                onClick={() => { setSelectedSection(selected ? null : g.section.key); setRightTab('threads') }}>
                <div style={st({ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 })}>
                  <span className="bri" style={st({ fontSize: 15, fontWeight: 700, color: selected ? meta.color : 'var(--t1)', letterSpacing: '-0.02em', flex: 1, transition: 'color 120ms' })}>{g.section.label}</span>
                  {threadCount > 0 && (
                    <span style={st({ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'var(--t3)' })}><Ico n="comment" s={10} c="var(--t3)" />{threadCount}</span>
                  )}
                  {rev === 'approved' && <span style={st({ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--ok)', fontWeight: 600 })}><Ico n="check" s={9} c="var(--ok)" /> Approved</span>}
                  {rev === 'changes' && <span style={st({ fontSize: 10, color: 'var(--err)', fontWeight: 600 })}>Changes requested</span>}
                </div>
                <div style={st({ paddingLeft: 18, borderLeft: `2px solid ${selected ? meta.color : 'var(--bd)'}`, transition: 'border-color 150ms' })}>
                  {g.items.slice(0, 4).map((r) => (
                    <div key={r.id} style={st({ display: 'flex', gap: 10, padding: '6px 0' })}>
                      <span className="mono" style={st({ fontSize: 10, color: meta.color, fontWeight: 700, flexShrink: 0 })}>{r.id}</span>
                      <span style={st({ fontSize: 13, color: selected ? 'var(--t1)' : 'var(--t2)', lineHeight: 1.6 })}>{r.text}</span>
                    </div>
                  ))}
                  {g.items.length > 4 && <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 6 })}>+{g.items.length - 4} more</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right panel */}
        <div style={st({ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%' })}>
          <div style={st({ display: 'flex', borderBottom: '1px solid var(--bd)', flexShrink: 0 })}>
            {([
              ['threads', `Threads${openThreads.length > 0 ? ` · ${openThreads.length}` : ''}`],
              ['review', 'Approvals'],
              ['chain', 'Chain'],
            ] as [typeof rightTab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setRightTab(t)}
                style={st({ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: `2px solid ${rightTab === t ? 'var(--ac)' : 'transparent'}`, fontSize: 11.5, fontWeight: rightTab === t ? 600 : 400, color: rightTab === t ? 'var(--t1)' : 'var(--t3)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 })}>
                {label}
              </button>
            ))}
          </div>

          <div style={st({ padding: '18px 18px 28px' })}>
            {/* Threads */}
            {rightTab === 'threads' && (
              selGroup ? (
                <div>
                  <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 })}>
                    <span style={st({ width: 4, height: 4, borderRadius: '50%', background: meta.color, flexShrink: 0 })} />
                    <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' })}>{selGroup.section.label}</span>
                  </div>
                  {commentsFor(selGroup.section.key).length === 0 && (
                    <p style={st({ fontSize: 12.5, color: 'var(--t3)', margin: '0 0 16px', fontStyle: 'italic' })}>No comments yet on this section.</p>
                  )}
                  {commentsFor(selGroup.section.key).map((cm) => (
                    <div key={cm.id} style={st({ display: 'flex', gap: 9, marginBottom: 14 })}>
                      <InitialBadge name="You" size={22} />
                      <div style={st({ flex: 1, minWidth: 0 })}>
                        <div style={st({ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 })}>
                          <span style={st({ fontSize: 12, fontWeight: 600, color: 'var(--t1)' })}>You</span>
                          <span style={st({ fontSize: 10.5, color: 'var(--t3)', marginLeft: 'auto' })}>{cm.at}</span>
                        </div>
                        <p style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, margin: 0 })}>{cm.text}</p>
                      </div>
                    </div>
                  ))}
                  <div style={st({ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, alignItems: 'flex-start' })}>
                    <InitialBadge name="You" size={22} />
                    <div style={st({ flex: 1 })}>
                      <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Add a comment on this section…" rows={2}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(selGroup.section.key) } }}
                        style={st({ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--bd)', padding: '4px 0', fontSize: 12.5, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6 })} />
                      {commentDraft.trim() && (
                        <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 })}>
                          <span style={st({ fontSize: 10.5, color: 'var(--t3)' })}>⌘ Enter to send</span>
                          <button onClick={() => addComment(selGroup.section.key)}
                            style={st({ background: 'var(--ac)', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0F0F0E', fontFamily: 'inherit' })}>
                            Comment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={st({ fontSize: 12.5, color: 'var(--t3)', margin: '8px 0 0', lineHeight: 1.6 })}>
                  Click a section in the document to view and add comments.
                </p>
              )
            )}

            {/* Approvals */}
            {rightTab === 'review' && (
              <div>
                <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 })}>Section approvals</div>
                {groups.map((g, i) => {
                  const status = reviews[aKey(g.section.key)]
                  return (
                    <div key={g.section.key} style={st({ padding: '12px 0', borderBottom: i < groups.length - 1 ? '1px solid var(--bd)' : 'none' })}>
                      <div style={st({ fontSize: 12.5, fontWeight: 500, color: 'var(--t1)', marginBottom: 8, lineHeight: 1.4 })}>{g.section.label}</div>
                      <div style={st({ display: 'flex', gap: 6 })}>
                        <button onClick={() => setReview(g.section.key, 'approved')}
                          style={st({ padding: '3px 10px', borderRadius: 100, background: status === 'approved' ? 'rgba(78,173,121,0.18)' : 'rgba(78,173,121,0.08)', border: `1px solid ${status === 'approved' ? 'var(--ok)' : 'rgba(78,173,121,0.3)'}`, fontSize: 11, color: 'var(--ok)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 })}>
                          Approve
                        </button>
                        <button onClick={() => setReview(g.section.key, 'changes')}
                          style={st({ padding: '3px 10px', borderRadius: 100, background: status === 'changes' ? 'rgba(224,85,85,0.18)' : 'rgba(224,85,85,0.08)', border: `1px solid ${status === 'changes' ? 'var(--err)' : 'rgba(224,85,85,0.25)'}`, fontSize: 11, color: 'var(--err)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 })}>
                          Request changes
                        </button>
                      </div>
                    </div>
                  )
                })}
                <p style={st({ fontSize: 11, color: 'var(--t3)', margin: '16px 0 0', lineHeight: 1.5 })}>
                  {Object.entries(reviews).filter(([k, v]) => k.startsWith(`${doc.id}::`) && v === 'approved').length} approved · {Object.entries(reviews).filter(([k, v]) => k.startsWith(`${doc.id}::`) && v === 'changes').length} changes · {groups.length} sections
                </p>
              </div>
            )}

            {/* Chain */}
            {rightTab === 'chain' && (
              <div>
                <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 })}>Document chain</div>
                {chain.map((t) => {
                  const active = t.id === doc.id
                  const tm = DOC_META[t.type ?? 'brd']
                  return (
                    <button key={t.id} onClick={() => setActiveDocId(t.id)}
                      style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--bd)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' })}>
                      <Ico n={tm.icon as any} s={13} c={tm.color} />
                      <span style={st({ fontSize: 12.5, color: active ? tm.color : 'var(--t1)', fontWeight: active ? 700 : 500, flex: 1 })}>{t.title}</span>
                      <span className="mono" style={st({ fontSize: 10.5, color: 'var(--t3)' })}>{t.requirements.length}</span>
                    </button>
                  )
                })}
                {isBRD && complete && (
                  <div style={st({ marginTop: 16 })}>
                    <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 })}>Generate next</div>
                    <div style={st({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 })}>
                      {DOWNSTREAM_TYPES.filter((t) => !existingTypes.has(t)).map((t) => (
                        <button key={t} onClick={() => startDownstream(t)}
                          style={st({ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' })}>
                          <Ico n={DOC_META[t].icon as any} s={12} c={DOC_META[t].color} />
                          <span style={st({ fontSize: 11, fontWeight: 600, color: 'var(--t1)' })}>{DOC_META[t].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isBRD && doc.requirements.length > 0 && (
                  <button onClick={() => drillToReq(doc.requirements[0].id)}
                    style={st({ marginTop: 16, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ac)', fontFamily: 'inherit', fontWeight: 500 })}>
                    <Ico n="shield" s={11} c="var(--ac)" /> Inspect a requirement&apos;s full trace →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' })}>
      {/* Toolbar */}
      <div style={st({ padding: '10px 24px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 })}>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 })}>
          {!isBRD && liveBRD && (
            <>
              <button onClick={backToBRD} title={`Back to ${liveBRD.title}`}
                style={st({ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7, background: 'var(--sf)', border: '1px solid var(--bd)', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 220, minWidth: 0 })}>
                <Ico n="arrow-l" s={11} c="var(--t3)" />
                <span style={st({ fontSize: 11.5, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}>{liveBRD.title}</span>
              </button>
              <Ico n="chevron-r" s={11} c="var(--bd2)" />
            </>
          )}
          <DocTag type={doc.type ?? 'brd'} />
          <span style={st({ color: 'var(--bd2)' })}>·</span>
          <span style={st({ fontSize: 12, color: complete ? 'var(--ok)' : 'var(--warn)', fontWeight: 600 })}>{complete ? 'Complete' : 'Incomplete'}</span>
        </div>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 })}>
          <div style={st({ display: 'flex', alignItems: 'center' })} title={doc.author && doc.author !== 'You' ? `You and ${doc.author} here` : 'You are here'}>
            <InitialBadge name="You" size={22} />
            {doc.author && doc.author !== 'You' && (
              <div style={st({ marginLeft: -6 })}><InitialBadge name={doc.author} size={22} /></div>
            )}
          </div>
          <span style={st({ color: 'var(--bd2)', margin: '0 2px' })}>·</span>
          <Btn v="ghost" sm onClick={onExport}><Ico n="download" s={12} c="var(--t2)" /> Export</Btn>
          <Btn v="ghost" sm onClick={onCopy}><Ico n="copy" s={12} c="var(--t2)" /> Copy</Btn>
          <div style={st({ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--bd)', marginLeft: 4 })}>
            {([['brief', 'Brief'], ['read', 'Full read'], ['act', 'Review']] as [DocMode, string][]).map(([dm, label]) => (
              <button key={dm} onClick={() => setMode(dm)}
                style={st({ padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: mode === dm ? 600 : 400, background: mode === dm ? 'var(--sf)' : 'transparent', color: mode === dm ? 'var(--t1)' : 'var(--t3)', fontFamily: 'inherit', whiteSpace: 'nowrap' })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll area: shared header + mode body */}
      <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>
        {renderHeader()}
        {mode === 'brief' && renderBrief()}
        {mode === 'read' && renderRead()}
        {mode === 'act' && renderReview()}
      </div>

      {/* Transient toast */}
      {toast && (
        <div style={st({ position: 'absolute', bottom: 20, right: 20, padding: '8px 14px', background: 'var(--t1)', color: 'var(--bg)', borderRadius: 8, fontSize: 12.5, fontWeight: 600, boxShadow: 'var(--sh2)', display: 'flex', alignItems: 'center', gap: 6 })}>
          <Ico n="check" s={12} c="var(--bg)" /> {toast}
        </div>
      )}
    </div>
  )
}

// ─── View entry: unified live viewer, or a clean empty state ──────────────────
export function DocumentView() {
  const { activeDoc } = useApp()
  if (!activeDoc) return <EmptyState />
  return <LiveDocViewer />
}
