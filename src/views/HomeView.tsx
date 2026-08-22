import { useEffect, useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { listBRDs, listSources, generateDocument } from '../lib/api'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'
import type { BRD, Source } from '../types'

export function HomeView() {
  const { setView, setGenOpen, setActiveSource, setLiveSource, setLiveBRD, setActiveBRDId, openBRD } = useApp()
  const [sources, setSources] = useState<Source[] | null>(null)
  const [brds, setBrds] = useState<BRD[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setSources(null); setBrds(null); setError(null)
    try {
      const [s, b] = await Promise.all([listSources(), listBRDs()])
      setSources(s); setBrds(b)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your data.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const generateFromSource = async (source: Source) => {
    try {
      const res = await generateDocument({ type: 'brd', sourceIds: [source.id] })
      setActiveSource(source); setLiveSource(source)
      setLiveBRD(res.brd); setActiveBRDId(res.brd.id)
      setView('document')
    } catch (e) {
      window.alert(`Generation failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const loading = sources === null || brds === null
  const totalReqs = (brds ?? []).reduce((s, b) => s + b.requirements.length, 0)
  const openConflicts = (brds ?? []).reduce((s, b) => s + b.conflicts.filter(c => !c.resolved).length, 0)

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>
      {/* Header */}
      <header style={st({ padding: '32px 52px 20px', borderBottom: '1px solid var(--bd)', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 16 })}>
            <Trace size={50} mood="wave" />
            <div>
              <h1 className="bri" style={st({ fontSize: 34, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.055em', margin: 0, lineHeight: 1 })}>{greeting}</h1>
              <p style={st({ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0' })}>
                {loading ? 'Loading your workspace…' : `${sources?.length ?? 0} sources · ${brds?.length ?? 0} BRDs · ${totalReqs} requirements`}
              </p>
            </div>
          </div>
          <div style={st({ display: 'flex', gap: 8, paddingTop: 4, flexShrink: 0 })}>
            <Btn v="primary" onClick={() => { setActiveSource(null); setGenOpen(true) }}><Ico n="sparkle" s={14} c="#0F0F0E" /> Generate doc</Btn>
            <Btn v="ghost" onClick={() => setView('projects')}><Ico n="folder" s={14} c="var(--t2)" /> All sources</Btn>
          </div>
        </div>
      </header>

      <main style={st({ flex: 1, overflowY: 'auto', padding: '12px 52px 64px' })}>
        {error && (
          <div style={st({ padding: '50px 24px', textAlign: 'center' })}>
            <Ico n="warning" s={32} c="var(--err)" />
            <p style={st({ fontSize: 14, color: 'var(--t3)', margin: '12px 0 18px' })}>{error}</p>
            <Btn v="primary" onClick={load}><Ico n="refresh" s={12} c="#0F0F0E" /> Retry</Btn>
          </div>
        )}

        {loading && !error && (
          <div style={st({ padding: '70px 24px', textAlign: 'center' })}>
            <Trace size={56} mood="thinking" />
            <p style={st({ fontSize: 13.5, color: 'var(--t3)', marginTop: 16 })}>Loading your sources &amp; documents…</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Recent documents (BRDs) */}
            <SectionTitle label="Your documents" count={brds?.length} />
            {(brds ?? []).length === 0 ? (
              <div style={st({ padding: '20px 0', fontSize: 13, color: 'var(--t3)' })}>
                No BRDs yet. Generate your first from a source below — or paste a new transcript.
              </div>
            ) : (
              <div style={st({ borderTop: '1px solid var(--bd)' })}>
                {(brds ?? []).map(brd => (
                  <BRDRow key={brd.id} brd={brd} onOpen={(id) => openBRD(id)} />
                ))}
              </div>
            )}

            {/* Sources */}
            <SectionTitle label="Your sources" count={sources?.length} />
            {(sources ?? []).length === 0 ? (
              <div style={st({ padding: '20px 0', fontSize: 13, color: 'var(--t3)' })}>
                No sources yet. Paste a meeting transcript to get started.
                <div style={st({ marginTop: 14 })}><Btn v="primary" onClick={() => { setActiveSource(null); setGenOpen(true) }}><Ico n="plus" s={12} c="#0F0F0E" /> Paste a transcript</Btn></div>
              </div>
            ) : (
              <div style={st({ borderTop: '1px solid var(--bd)' })}>
                {(sources ?? []).map(src => (
                  <SourceRow key={src.id} source={src} onGenerate={generateFromSource} />
                ))}
              </div>
            )}

            <div style={st({ marginTop: 40, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--t3)' })}>
              <span style={st({ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)' })} />
              Everything above is loaded live from the backend (Neon) — your real sources &amp; documents, not sample data.
              {openConflicts > 0 && <span> · <span style={{ color: 'var(--err)' }}>{openConflicts} open conflict{openConflicts > 1 ? 's' : ''}</span> across your BRDs</span>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <div style={st({ display: 'flex', alignItems: 'baseline', gap: 8, margin: '34px 4px 4px' })}>
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
      style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--bd)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' })}
    >
      <div style={st({ width: 7, height: 7, borderRadius: '50%', background: '#F5A623', flexShrink: 0 })} />
      <div style={st({ flex: 1, minWidth: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' })}>
          <span className="bri" style={st({ fontSize: 14, fontWeight: 750, color: hov ? 'var(--ac)' : 'var(--t1)', letterSpacing: '-0.02em' })}>{brd.title}</span>
          <span style={st({ fontSize: 10, fontWeight: 700, color: brd.complete ? 'var(--ok)' : 'var(--warn)', background: brd.complete ? 'rgba(78,173,121,0.12)' : 'rgba(230,163,60,0.12)', padding: '1px 7px', borderRadius: 100 })}>{brd.complete ? 'Complete' : 'Incomplete'}</span>
        </div>
        <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 3 })}>{brd.requirements.length} requirements · {new Date(brd.createdAt).toLocaleString()}</div>
      </div>
      <span style={st({ opacity: hov ? 1 : 0, transition: 'opacity 120ms' })}><Ico n="arrow-r" s={14} c="var(--ac)" /></span>
    </button>
  )
}

function SourceRow({ source, onGenerate }: { source: Source; onGenerate: (s: Source) => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <div style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--bd)' })}>
      <div style={st({ width: 7, height: 7, borderRadius: '50%', background: '#5B8DEF', flexShrink: 0 })} />
      <div style={st({ flex: 1, minWidth: 0 })}>
        <div style={st({ fontSize: 13.5, fontWeight: 650, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{source.title}</div>
        <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 2 })}>by {source.author || 'Current user'} · {new Date(source.created_at).toLocaleString()}</div>
      </div>
      <Btn sm v="primary" disabled={busy} onClick={async () => { setBusy(true); try { await onGenerate(source) } finally { setBusy(false) } }}>
        {busy ? <Trace size={14} mood="thinking" /> : <Ico n="sparkle" s={11} c="#0F0F0E" />}
        {busy ? 'Generating…' : 'Generate BRD'}
      </Btn>
    </div>
  )
}
