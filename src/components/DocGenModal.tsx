import { useEffect, useState } from 'react'
import { DOC_META } from '../data'
import { SAMPLE_TRANSCRIPTS } from '../data/samples'
import { useApp } from '../context/AppContext'
import { saveSource, generateDocument, listSources, GenerationLockedError } from '../lib/api'
import { DOCUMENT_FRAMEWORKS, type DocumentFramework } from '../lib/documentTypes'
import { Ico } from './ui/Icon'
import { Btn } from './ui/Button'
import { Trace } from './Trace'
import { st } from '../lib/utils'
import type { DocType, Source } from '../types'

interface Props {
  onClose: () => void
  onGenerate: () => void
}

type Phase = 'type' | 'configure' | 'working'
type SourceMode = 'paste' | 'existing'

/**
 * The generate dialog runs two real, gated flows against the type-safe
 * `/api/documents/generate` endpoint — never fake progress:
 *
 *  • BRD flow — ingest a source (paste a NEW transcript, or reuse one already
 *    persisted via `listSources`) → generate a fully-traced BRD whose every
 *    requirement quotes a verbatim line and whose conflicts gate completeness.
 *  • Downstream flow (PRD / Tech Spec / Stories / Roadmap / Research) — derive
 *    from the live, COMPLETE BRD. No transcript; provenance is one level up to
 *    the parent BRD. Locked until the BRD is complete, and the server re-checks
 *    the gate (a `GenerationLockedError` surfaces its honest reason).
 *
 * Throughout, the framework registry (`DOCUMENT_FRAMEWORKS`) is surfaced so the
 * flow shows its work: the standard structure Trace will produce and the
 * traceability guarantee that makes the output a spec-integrity artifact.
 */
export function DocGenModal({ onClose, onGenerate }: Props) {
  const { prdUnlocked, liveBRD, setLiveSource, upsertLiveDoc, resetLive, setServerStatus, setGenOpen, genPreset, setGenPreset } = useApp()

  // Seeded from a gate-card preset (e.g. "Generate PRD") — skip the type picker.
  const [docType, setDocType] = useState<DocType | null>(genPreset)
  const [phase, setPhase] = useState<Phase>(genPreset ? 'configure' : 'type')
  const [brief, setBrief] = useState('')
  const [briefOpen, setBriefOpen] = useState(false)

  // BRD source configuration.
  const [sourceMode, setSourceMode] = useState<SourceMode>('paste')
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [existing, setExisting] = useState<Source[]>([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [existingError, setExistingError] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  const [genProgress, setGenProgress] = useState(0)
  const [genStep, setGenStep] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isDownstream = !!docType && docType !== 'brd'
  const meta = docType ? DOC_META[docType] : null
  const fw = docType ? DOCUMENT_FRAMEWORKS[docType] : null
  const label = meta ? meta.label : 'document'

  const canGenerateBrd = sourceMode === 'paste' ? transcript.trim().length > 0 : !!selectedSourceId

  const close = () => { setGenPreset(null); onClose() }
  const finishOk = () => {
    setGenPreset(null)
    setTimeout(() => { setGenOpen(false); onGenerate() }, 300)
  }

  // Lazily load persisted sources the first time the user opens the reuse tab.
  useEffect(() => {
    if (sourceMode !== 'existing' || existing.length > 0 || existingLoading) return
    let cancelled = false
    setExistingLoading(true)
    setExistingError(null)
    listSources()
      .then((rows) => { if (!cancelled) setExisting(rows) })
      .catch((e) => { if (!cancelled) setExistingError(e instanceof Error ? e.message : 'Could not load saved sources.') })
      .finally(() => { if (!cancelled) setExistingLoading(false) })
    return () => { cancelled = true }
  }, [sourceMode, existing.length, existingLoading])

  const runGenerate = async () => {
    setPhase('working')
    setError(null)
    setGenProgress(10)
    try {
      if (isDownstream) {
        if (!liveBRD) throw new Error('No BRD to derive from yet. Generate a BRD first.')
        setGenStep(`Deriving your ${label} from “${liveBRD.title}” — tracing each item up to a requirement…`)
        setGenProgress(50)
        const { brd, status } = await generateDocument({
          type: docType as DocType,
          parentDocumentId: liveBRD.id,
          brief: brief.trim() || undefined,
        })
        setServerStatus(status)
        setGenProgress(100)
        upsertLiveDoc(brd)
        finishOk()
        return
      }

      // A fresh root BRD starts a new chain — clear any prior live docs so
      // `liveBRD` (first no-parent doc) can't resolve to a stale root.
      resetLive()
      let sourceId: string

      if (sourceMode === 'existing') {
        const picked = existing.find((s) => s.id === selectedSourceId)
        if (!picked) throw new Error('Pick a saved source to generate from.')
        setLiveSource(picked)
        sourceId = picked.id
        setGenStep('Reading the source, attributing speakers & extracting requirements…')
        setGenProgress(55)
      } else {
        setGenStep('Saving source…')
        setGenProgress(25)
        const { source, status } = await saveSource({
          title: title.trim() || brief.trim().slice(0, 60) || 'Ingested transcript',
          rawText: transcript,
          author: 'Current user',
        })
        setServerStatus(status)
        setLiveSource(source)
        sourceId = source.id
        setGenStep('Reading transcript, attributing speakers & extracting requirements…')
        setGenProgress(60)
      }

      const { brd, status: genStatus } = await generateDocument({
        type: 'brd',
        sourceIds: [sourceId],
        brief: brief.trim() || undefined,
      })
      setServerStatus(genStatus)
      setGenStep('Detecting conflicts & structuring the BRD…')
      setGenProgress(100)
      upsertLiveDoc(brd)
      finishOk()
    } catch (e) {
      const msg =
        e instanceof GenerationLockedError ? (e.gate?.reason || e.message)
        : e instanceof Error ? e.message
        : 'Generation failed.'
      setError(msg)
      setPhase('configure')
    }
  }

  const headerTitle =
    phase === 'type' ? 'What are we building?'
    : phase === 'configure' ? (isDownstream ? `Generate your ${label}` : 'Ingest a source')
    : 'Trace is generating…'
  const subtitle =
    phase === 'type' ? 'Pick a document type — everything downstream traces back to it'
    : phase === 'configure' ? (isDownstream ? 'Derived from your live BRD — every item links one level up' : 'Paste a transcript or reuse a source you’ve already ingested')
    : 'Hang tight, this takes a moment'

  return (
    <div
      style={st({ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: 24 })}
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div style={st({ width: phase === 'working' ? 520 : 700, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--sf)', borderRadius: 22, overflow: 'hidden', border: '1.5px solid var(--bd2)', boxShadow: 'var(--sh2)', transition: 'width 0.2s ease' })}>
        {/* Header */}
        <div style={st({ padding: '18px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 })}>
          <Trace size={38} mood={phase === 'working' ? 'thinking' : phase === 'type' ? 'wave' : 'excited'} />
          <div>
            <div className="bri" style={st({ fontSize: 15, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' })}>
              {headerTitle}
            </div>
            <div style={st({ fontSize: 12, color: 'var(--t3)' })}>{subtitle}</div>
          </div>
          <button onClick={close} style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 4 })}>
            <Ico n="close" s={18} c="var(--t2)" />
          </button>
        </div>

        <div style={st({ padding: 22, overflowY: 'auto' })}>
          {/* ── Phase: type picker (downstream types gated on a complete BRD) ── */}
          {phase === 'type' && (
            <div>
              <div style={st({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 })}>
                {(Object.entries(DOC_META) as [DocType, typeof DOC_META[DocType]][]).map(([key, m]) => {
                  const locked = key !== 'brd' && !prdUnlocked
                  const tag = DOCUMENT_FRAMEWORKS[key].frameworkTag
                  return (
                    <button
                      key={key}
                      disabled={locked}
                      onClick={() => { if (!locked) { setDocType(key); setBriefOpen(false); setError(null); setPhase('configure') } }}
                      style={st({ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 14px', borderRadius: 14, background: 'var(--bg)', border: '1.5px solid var(--bd)', cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'inherit', opacity: locked ? 0.6 : 1, transition: 'all 0.12s' })}
                      onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLElement).style.borderColor = m.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
                    >
                      <div style={st({ width: 36, height: 36, borderRadius: 10, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                        <Ico n={locked ? 'lock' : (m.icon as any)} s={17} c={locked ? 'var(--t3)' : m.color} />
                      </div>
                      <div style={st({ minWidth: 0 })}>
                        <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 })}>
                          <span style={st({ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' })}>{m.label}</span>
                          <span style={st({ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.03em', color: m.color, background: `${m.color}18`, padding: '1px 6px', borderRadius: 5 })}>{tag}</span>
                        </div>
                        <div style={st({ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.45 })}>
                          {locked ? 'Unlocks after a complete BRD' : m.desc}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* The chain — communicates the gate and where each doc sits. */}
              <ChainStrip prdUnlocked={prdUnlocked} />
            </div>
          )}

          {/* ── Phase: configure (BRD source + brief, or downstream brief) ── */}
          {phase === 'configure' && meta && fw && (
            <div style={st({ display: 'flex', gap: 18, alignItems: 'flex-start' })}>
              <div style={st({ flex: 1, minWidth: 0 })}>
                {/* Selected-type badge with a way back to the picker. */}
                <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 13px', background: `${meta.color}0D`, borderRadius: 12, border: `1.5px solid ${meta.color}30` })}>
                  <Ico n={meta.icon as any} s={18} c={meta.color} />
                  <span style={st({ fontSize: 13.5, fontWeight: 700, color: meta.color })}>{meta.label}</span>
                  {!genPreset && (
                    <button onClick={() => { setPhase('type'); setDocType(null); setError(null) }} style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t3)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 })}>
                      <Ico n="arrow-l" s={12} c="var(--t3)" /> Change
                    </button>
                  )}
                </div>

                {error && (
                  <div style={st({ marginBottom: 14, padding: '10px 12px', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 10, fontSize: 12.5, color: 'var(--err)', lineHeight: 1.5 })}>
                    {error}
                  </div>
                )}

                {/* Downstream: no source — provenance is the live BRD. */}
                {isDownstream ? (
                  <>
                    {liveBRD && (
                      <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16, padding: '11px 13px', background: 'var(--bg)', borderRadius: 11, border: '1px solid var(--bd)' })}>
                        <Ico n="link" s={14} c="var(--ac)" />
                        <span style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5 })}>
                          Derives from <strong style={st({ fontWeight: 600, color: 'var(--t1)' })}>{liveBRD.title}</strong> — {liveBRD.requirements.length} traced requirement{liveBRD.requirements.length === 1 ? '' : 's'}. Every item links back one level up.
                        </span>
                      </div>
                    )}
                    <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 })}>
                      Anything specific this {label} should focus on? <span style={st({ color: 'var(--t3)', fontWeight: 400 })}>(optional)</span>
                    </label>
                    <textarea
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                      placeholder={`e.g. Emphasise the mobile checkout path and the fraud-review edge cases.`}
                      style={st({ width: '100%', minHeight: 92, background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' })}
                    />
                  </>
                ) : (
                  <>
                    {/* Source mode toggle: paste new vs reuse persisted. */}
                    <div style={st({ display: 'flex', gap: 4, padding: 4, background: 'var(--bg)', borderRadius: 11, border: '1px solid var(--bd)', marginBottom: 16 })}>
                      {([['paste', 'Paste new'], ['existing', 'Reuse a source']] as [SourceMode, string][]).map(([m, lbl]) => (
                        <button
                          key={m}
                          onClick={() => { setSourceMode(m); setError(null) }}
                          style={st({ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, background: sourceMode === m ? 'var(--sf)' : 'transparent', color: sourceMode === m ? 'var(--t1)' : 'var(--t3)', boxShadow: sourceMode === m ? '0 1px 3px rgba(0,0,0,0.28)' : 'none', transition: 'all 0.12s' })}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>

                    {sourceMode === 'paste' ? (
                      <>
                        <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Source title</label>
                        <input
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="e.g. Checkout overhaul — kickoff sync"
                          style={st({ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 14 })}
                        />
                        <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Meeting transcript / note</label>
                        <textarea
                          value={transcript}
                          onChange={e => setTranscript(e.target.value)}
                          placeholder="Paste a meeting transcript or Loom-style note. Lines like 'Name: statement' capture the speaker for traceability."
                          style={st({ width: '100%', minHeight: 158, background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' })}
                        />
                        <div style={st({ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, flexWrap: 'wrap' })}>
                          <span style={st({ fontSize: 11, color: 'var(--t3)', fontWeight: 600 })}>Try a sample:</span>
                          {SAMPLE_TRANSCRIPTS.map(s => (
                            <button
                              key={s.id}
                              onClick={() => { setTranscript(s.text); setTitle(t => t.trim() ? t : s.title); setBrief(b => b.trim() ? b : s.brief) }}
                              title={s.hint}
                              style={st({ background: 'none', border: '1px dashed var(--bd2)', borderRadius: 8, padding: '5px 11px', fontSize: 11.5, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit' })}
                            >
                              {s.title.split('—')[0].trim()}
                            </button>
                          ))}
                          <span style={st({ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' })}>{transcript.length} chars</span>
                        </div>
                      </>
                    ) : (
                      <ExistingSources
                        rows={existing}
                        loading={existingLoading}
                        error={existingError}
                        selectedId={selectedSourceId}
                        onSelect={setSelectedSourceId}
                        onPaste={() => setSourceMode('paste')}
                      />
                    )}

                    {/* Optional brief, collapsed by default so the source is the focus. */}
                    <button
                      onClick={() => setBriefOpen(o => !o)}
                      style={st({ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--t2)', fontWeight: 600 })}
                    >
                      <Ico n={briefOpen ? 'chevron-d' : 'chevron-r'} s={13} c="var(--t2)" />
                      Add a brief {brief.trim() ? '· 1 added' : '(optional)'}
                    </button>
                    {briefOpen && (
                      <textarea
                        value={brief}
                        onChange={e => setBrief(e.target.value)}
                        placeholder="e.g. Focus the BRD on reducing cart abandonment and multi-currency support."
                        style={st({ width: '100%', minHeight: 70, marginTop: 8, background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' })}
                      />
                    )}
                  </>
                )}

                {/* Footer action */}
                <div style={st({ display: 'flex', justifyContent: 'flex-end', marginTop: 22 })}>
                  {isDownstream ? (
                    <Btn v="ai" onClick={runGenerate} disabled={!liveBRD?.complete} title={liveBRD?.complete ? undefined : 'Needs a complete BRD (every requirement traced, no open conflicts)'}>
                      <Trace size={20} mood="excited" /> Generate {label}
                    </Btn>
                  ) : (
                    <Btn v="ai" onClick={runGenerate} disabled={!canGenerateBrd} title={canGenerateBrd ? undefined : (sourceMode === 'paste' ? 'Paste a transcript first' : 'Select a saved source first')}>
                      <Trace size={20} mood="excited" /> Generate with Trace
                    </Btn>
                  )}
                </div>
              </div>

              {/* Persistent "what Trace will produce" framework panel. */}
              <FrameworkPanel color={meta.color} fw={fw} />
            </div>
          )}

          {/* ── Phase: generating ── */}
          {phase === 'working' && (
            <div style={st({ textAlign: 'center', padding: '10px 0' })}>
              <div style={st({ display: 'flex', justifyContent: 'center', marginBottom: 20 })}>
                <Trace size={72} mood="thinking" />
              </div>
              <p className="bri" style={st({ fontSize: 16, fontWeight: 800, color: 'var(--t1)', margin: '0 0 6px', letterSpacing: '-0.02em' })}>
                {genProgress < 100 ? 'Trace is working…' : 'Almost there!'}
              </p>
              <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 24px', lineHeight: 1.5 })}>{genStep}</p>
              <div style={st({ width: '100%', height: 8, background: 'var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 })}>
                <div style={st({ height: '100%', background: 'linear-gradient(90deg,#9B6FE8,#5B8DEF)', borderRadius: 10, width: `${genProgress}%`, transition: 'width 0.6s ease' })} />
              </div>
              <p style={st({ fontSize: 12, color: 'var(--t3)' })}>{genProgress}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** The gated chain of document types, shown under the picker. */
function ChainStrip({ prdUnlocked }: { prdUnlocked: boolean }) {
  const keys = Object.keys(DOC_META) as DocType[]
  return (
    <div style={st({ marginTop: 18, padding: '12px 14px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--bd)' })}>
      <div style={st({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' })}>
        {keys.map((k, i) => {
          const m = DOC_META[k]
          const locked = k !== 'brd' && !prdUnlocked
          return (
            <div key={k} style={st({ display: 'flex', alignItems: 'center', gap: 6 })}>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 8, background: locked ? 'transparent' : `${m.color}14`, border: `1px solid ${locked ? 'var(--bd)' : `${m.color}30`}`, opacity: locked ? 0.5 : 1 })}>
                <Ico n={locked ? 'lock' : (m.icon as any)} s={11} c={locked ? 'var(--t3)' : m.color} />
                <span style={st({ fontSize: 10.5, fontWeight: 700, color: locked ? 'var(--t3)' : 'var(--t1)' })}>{m.label}</span>
              </div>
              {i < keys.length - 1 && <Ico n="chevron-r" s={11} c="var(--t3)" />}
            </div>
          )
        })}
      </div>
      <p style={st({ fontSize: 11, color: 'var(--t3)', margin: '10px 2px 0', lineHeight: 1.5 })}>
        <Ico n="lock" s={10} c="var(--t3)" /> The BRD is the gate. Everything downstream unlocks only once it’s complete — every requirement traced &amp; no open conflicts.
      </p>
    </div>
  )
}

/** Right-rail panel showing the framework structure + traceability guarantee. */
function FrameworkPanel({ color, fw }: { color: string; fw: DocumentFramework }) {
  return (
    <div style={st({ width: 238, flexShrink: 0, background: 'var(--bg)', borderRadius: 14, border: '1px solid var(--bd)', padding: 16, alignSelf: 'stretch' })}>
      <div style={st({ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 })}>
        <Ico n="sparkle" s={13} c={color} />
        <span style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.04em' })}>Trace will produce</span>
      </div>
      <p style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)', margin: '0 0 4px', lineHeight: 1.4 })}>{fw.produces}</p>
      <span style={st({ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', color, background: `${color}18`, padding: '2px 8px', borderRadius: 6, marginBottom: 14 })}>{fw.framework}</span>

      <div style={st({ fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 })}>Structure</div>
      <div style={st({ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 })}>
        {fw.sections.map((s) => (
          <div key={s} style={st({ display: 'flex', alignItems: 'flex-start', gap: 7 })}>
            <div style={st({ width: 5, height: 5, borderRadius: 5, background: color, marginTop: 6, flexShrink: 0 })} />
            <span style={st({ fontSize: 12, color: 'var(--t2)', lineHeight: 1.4 })}>{s}</span>
          </div>
        ))}
      </div>

      <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 11px', background: 'var(--sf)', borderRadius: 10, border: '1px solid var(--bd)' })}>
        <Ico n="shield" s={14} c="var(--ok)" />
        <span style={st({ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.5 })}>{fw.traceRule}</span>
      </div>
    </div>
  )
}

/** The "reuse a persisted source" picker (wires `listSources`). */
function ExistingSources({ rows, loading, error, selectedId, onSelect, onPaste }: {
  rows: Source[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  onPaste: () => void
}) {
  if (loading) {
    return (
      <div style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '28px 0', justifyContent: 'center', color: 'var(--t3)', fontSize: 13 })}>
        <Ico n="refresh" s={15} c="var(--t3)" /> Loading saved sources…
      </div>
    )
  }
  if (error) {
    return (
      <div style={st({ padding: '12px 13px', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 11, fontSize: 12.5, color: 'var(--err)', lineHeight: 1.5 })}>
        {error}
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div style={st({ padding: '24px 16px', textAlign: 'center', background: 'var(--bg)', border: '1px dashed var(--bd2)', borderRadius: 12 })}>
        <Ico n="folder" s={22} c="var(--t3)" />
        <p style={st({ fontSize: 13, color: 'var(--t2)', margin: '8px 0 4px', fontWeight: 600 })}>No saved sources yet</p>
        <p style={st({ fontSize: 12, color: 'var(--t3)', margin: '0 0 12px', lineHeight: 1.5 })}>Ingested transcripts show up here to reuse.</p>
        <button onClick={onPaste} style={st({ background: 'none', border: '1.5px solid var(--bd2)', borderRadius: 9, padding: '7px 14px', fontSize: 12.5, color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 })}>
          Paste one instead
        </button>
      </div>
    )
  }
  return (
    <div style={st({ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 230, overflowY: 'auto' })}>
      {rows.map((s) => {
        const on = s.id === selectedId
        const when = fmtDate(s.created_at)
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={st({ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', padding: '11px 13px', borderRadius: 11, background: on ? 'var(--ac-soft, rgba(245,166,35,0.10))' : 'var(--bg)', border: `1.5px solid ${on ? 'var(--ac)' : 'var(--bd)'}`, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' })}
          >
            <div style={st({ width: 18, height: 18, borderRadius: 9, border: `1.5px solid ${on ? 'var(--ac)' : 'var(--bd2)'}`, background: on ? 'var(--ac)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 })}>
              {on && <Ico n="check" s={11} c="#0F0F0E" />}
            </div>
            <div style={st({ minWidth: 0, flex: 1 })}>
              <div style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{s.title}</div>
              <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 2 })}>
                {s.author}{when ? ` · ${when}` : ''} · {s.rawText.length} chars
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
