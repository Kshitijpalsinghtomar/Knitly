import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { listBRDs, listSources, generateDocument } from '../lib/api'
import { Ico } from './ui/Icon'
import { Btn } from './ui/Button'
import { Trace } from './Trace'
import { st } from '../lib/utils'
import type { BRD, Source } from '../types'

/** Simple spinner / loading block. */
function Loading() {
  return (
    <div style={st({ padding: '70px 24px', textAlign: 'center' })}>
      <Trace size={56} mood="thinking" />
      <p style={st({ fontSize: 13.5, color: 'var(--t3)', marginTop: 16 })}>Loading your sources &amp; documents…</p>
    </div>
  )
}

function ErrorBlock({ message, onRetry, onBrowse }: { message: string; onRetry: () => void; onBrowse?: () => void }) {
  return (
    <div style={st({ padding: '70px 24px', textAlign: 'center' })}>
      <Ico n="warning" s={34} c="var(--err)" />
      <p className="bri" style={st({ fontSize: 18, fontWeight: 800, color: 'var(--t1)', margin: '16px 0 6px' })}>Couldn’t reach the backend</p>
      <p style={st({ fontSize: 13, color: 'var(--t3)', margin: '0 auto 20px', maxWidth: 420, lineHeight: 1.6 })}>{message}</p>
      <div style={st({ display: 'flex', justifyContent: 'center', gap: 8 })}>
        <Btn v="primary" onClick={onRetry}><Ico n="refresh" s={12} c="#0F0F0E" /> Retry</Btn>
      </div>
    </div>
  )
}

function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <div style={st({ display: 'flex', alignItems: 'baseline', gap: 8, margin: '38px 4px 12px' })}>
      <span className="mono" style={st({ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>{label}</span>
      {typeof count === 'number' && <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{count}</span>}
    </div>
  )
}

function BRDRow({ brd, onOpen }: { brd: BRD; onOpen: (id: string) => void }) {
  const [hov, setHov] = useState(false)
  const openConflicts = brd.conflicts.filter(c => !c.resolved).length
  return (
    <button
      onClick={() => onOpen(brd.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '15px 0', background: 'none', border: 'none',
        borderBottom: '1px solid var(--bd)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      })}
    >
      <div style={st({ width: 8, height: 8, borderRadius: '50%', background: '#F5A623', flexShrink: 0 })} />
      <div style={st({ flex: 1, minWidth: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' })}>
          <span className="bri" style={st({ fontSize: 14.5, fontWeight: 750, color: hov ? 'var(--ac)' : 'var(--t1)', letterSpacing: '-0.02em', transition: 'color 120ms' })}>
            {brd.title}
          </span>
          <span style={st({ fontSize: 10, fontWeight: 700, color: brd.complete ? 'var(--ok)' : 'var(--warn)', background: brd.complete ? 'rgba(78,173,121,0.12)' : 'rgba(230,163,60,0.12)', padding: '1px 7px', borderRadius: 100 })}>
            {brd.complete ? 'Complete' : 'Incomplete'}
          </span>
        </div>
        <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' })}>
          <span>{new Date(brd.createdAt).toLocaleString()}</span>
          <span style={st({ color: 'var(--bd2)' })}>·</span>
          <span>{brd.requirements.length} requirements</span>
          {openConflicts > 0 && (
            <>
              <span style={st({ color: 'var(--bd2)' })}>·</span>
              <span style={st({ color: 'var(--err)' })}>{openConflicts} open conflict{openConflicts > 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>
      <span style={st({ opacity: hov ? 1 : 0, transition: 'opacity 120ms', color: 'var(--ac)' })}>
        <Ico n="arrow-r" s={14} c="var(--ac)" />
      </span>
    </button>
  )
}

function SourceRow({ source, onGenerate }: { source: Source; onGenerate: (s: Source) => void }) {
  const [hov, setHov] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--bd)' })}
    >
      <div style={st({ width: 8, height: 8, borderRadius: '50%', background: '#5B8DEF', flexShrink: 0 })} />
      <div style={st({ flex: 1, minWidth: 0 })}>
        <div style={st({ fontSize: 14, fontWeight: 650, color: hov ? 'var(--ac)' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
          {source.title}
        </div>
        <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' })}>
          <span>by {source.author || 'Current user'}</span>
          <span style={st({ color: 'var(--bd2)' })}>·</span>
          <span>{new Date(source.created_at).toLocaleString()}</span>
        </div>
      </div>
      <Btn sm v="primary" disabled={busy}
        onClick={async () => { setBusy(true); try { await onGenerate(source) } finally { setBusy(false) } }}
        title={source.title}>
        {busy ? <Trace size={16} mood="thinking" /> : <Ico n="sparkle" s={11} c="#0F0F0E" />}
        {busy ? 'Generating…' : 'Generate BRD'}
      </Btn>
    </div>
  )
}

interface Props {
  title: string
  subtitle: string
  /** Show a prominent "paste a new transcript" action (opens the generate modal, no source preselected). */
  showNew?: boolean
}

/**
 * REAL browse surface for the core document flow.
 * Reads sources + BRDs from the live API (listBRDs / listSources), lets the
 * user generate a BRD from any source (via POST /api/documents/generate) and
 * open a specific BRD to view ITS OWN requirements/conflicts. No fixtures.
 */
export function LiveBrowse({ title, subtitle, showNew = true }: Props) {
  const { openBRD, setGenOpen, setActiveSource, setLiveBRD, setLiveSource, setActiveBRDId, setView } = useApp()
  const [sources, setSources] = useState<Source[] | null>(null)
  const [brds, setBrds] = useState<BRD[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<boolean>(false)

  const load = useCallback(async () => {
    setError(null)
    setSources(null)
    setBrds(null)
    try {
      const [s, b] = await Promise.all([listSources(), listBRDs()])
      setSources(s)
      setBrds(b)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your data.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const generateFromSource = async (source: Source) => {
    setGenerating(true)
    try {
      const res = await generateDocument({ type: 'brd', sourceIds: [source.id] })
      setActiveSource(source)
      setLiveSource(source)
      setLiveBRD(res.brd)
      setActiveBRDId(res.brd.id)
      setView('document')
    } catch (e) {
      window.alert(`Generation failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const loading = sources === null || brds === null

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>

      {/* Header */}
      <div style={st({ padding: '30px 52px 22px', borderBottom: '1px solid var(--bd)', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 })}>
          <div>
            <h1 className="bri" style={st({ fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--t1)', margin: '0 0 8px', lineHeight: 1 })}>
              {title}
            </h1>
            <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0, maxWidth: 520 })}>{subtitle}</p>
          </div>
          {showNew && (
            <Btn v="primary" disabled={generating} onClick={() => { setActiveSource(null); setGenOpen(true) }}>
              <Ico n="plus" s={14} c="#0F0F0E" /> Paste a transcript
            </Btn>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={st({ flex: 1, overflowY: 'auto', padding: '0 52px 70px' })}>
        {error && !loading && (
          <div style={st({ marginTop: 24 })}>
            <ErrorBlock message={error} onRetry={load} />
          </div>
        )}

        {loading && !error && <Loading />}

        {!loading && !error && (
          <>
            {/* Documents (BRDs) */}
            <SectionTitle label="Documents (BRDs)" count={brds?.length ?? 0} />
            {brds && brds.length > 0 ? (
              <div style={st({ borderTop: '1px solid var(--bd)' })}>
                {brds.map(brd => <BRDRow key={brd.id} brd={brd} onOpen={(id) => openBRD(id)} />)}
              </div>
            ) : (
              <div style={st({ padding: '22px 0', fontSize: 13, color: 'var(--t3)' })}>
                No BRDs yet — pick a source below and generate your first Business Requirements Document.
              </div>
            )}

            {/* Sources */}
            <SectionTitle label="Sources" count={sources?.length ?? 0} />
            {sources && sources.length > 0 ? (
              <div style={st({ borderTop: '1px solid var(--bd)' })}>
                {sources.map(src => <SourceRow key={src.id} source={src} onGenerate={generateFromSource} />)}
              </div>
            ) : (
              <div style={st({ padding: '22px 0', fontSize: 13, color: 'var(--t3)' })}>
                No sources yet. Paste a meeting transcript to get started.
              </div>
            )}

            <div style={st({ marginTop: 40, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--t3)' })}>
              <span style={st({ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)' })} />
              All documents &amp; sources above are loaded from the live backend (Neon) — not sample data.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
