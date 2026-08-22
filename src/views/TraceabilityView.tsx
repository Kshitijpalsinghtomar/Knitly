import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'

function LiveTraceRow({ id, text, author, quote, ts }: { id: string; text: string; author?: string; quote?: string; ts?: string }) {
  const [hov, setHov] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '13px 16px', borderBottom: '1px solid var(--bd)',
        background: hov ? 'var(--sf)' : 'none', margin: '0 -16px', cursor: 'pointer',
      })}
      onClick={() => setShowQuote(s => !s)}
    >
      <div style={st({ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0, marginTop: 5 })} />
      <div style={st({ flex: 1, minWidth: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'baseline', gap: 8 })}>
          <span className="mono" style={st({ fontSize: 12, fontWeight: 700, color: 'var(--t3)', flexShrink: 0 })}>{id}</span>
          <span style={st({ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5, flex: 1 })}>{text}</span>
          <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ok)', background: 'rgba(78,173,121,0.12)', padding: '1px 7px', borderRadius: 100, flexShrink: 0 })}>traced</span>
        </div>
        <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' })}>
          {author && <span>by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{author}</strong></span>}
          {ts && <><span style={st({ color: 'var(--bd2)' })}>·</span><span>{new Date(ts).toLocaleString()}</span></>}
        </div>
        {showQuote && quote && (
          <blockquote style={st({ margin: '10px 0 0', padding: '10px 14px', background: 'var(--sf)', borderLeft: '3px solid #5B8DEF', borderRadius: 8, fontSize: 12.5, fontStyle: 'italic', color: 'var(--t2)', lineHeight: 1.6 })}>
            {quote}
          </blockquote>
        )}
      </div>
    </div>
  )
}

export function TraceabilityView() {
  const { liveBRD, liveSource, setView, cancelDocument } = useApp()
  const [filter, setFilter] = useState<'all' | 'traced'>('all')

  if (!liveBRD) {
    return (
      <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 6 })}>
        <Trace size={64} mood="thinking" />
        <p className="bri" style={st({ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: '18px 0 6px', letterSpacing: '-0.03em' })}>Open a document first</p>
        <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 20px', maxWidth: 400, textAlign: 'center' })}>
          Traceability is per-document. Open a generated BRD to see each requirement traced back to its source quote.
        </p>
        <Btn v="primary" onClick={cancelDocument}><Ico n="folder" s={12} c="#0F0F0E" /> Browse documents</Btn>
      </div>
    )
  }

  const reqs = filter === 'all' ? liveBRD.requirements : liveBRD.requirements.filter(r => r.sourceQuote && r.sourceQuote.trim())
  const tracedCount = liveBRD.requirements.filter(r => r.sourceQuote && r.sourceQuote.trim()).length
  const openConflicts = liveBRD.conflicts.filter(c => !c.resolved).length

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>
      {/* Header */}
      <div style={st({ padding: '30px 52px 0', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 })}>
          <div>
            <div style={st({ fontSize: 11, color: 'var(--t3)', marginBottom: 6 })}>Source: {liveSource?.title ?? liveBRD.sourceId}</div>
            <h1 className="bri" style={st({ fontSize: 34, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.05em', margin: 0, lineHeight: 1 })}>
              Requirement traceability
            </h1>
          </div>
          <div style={st({ display: 'flex', gap: 28, alignItems: 'flex-end' })}>
            <div style={st({ textAlign: 'right' })}>
              <div className="bri" style={st({ fontSize: 34, fontWeight: 800, color: 'var(--ok)', letterSpacing: '-0.06em', lineHeight: 1 })}>{tracedCount}</div>
              <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 3 })}>traced</div>
            </div>
            <div style={st({ textAlign: 'right' })}>
              <div className="bri" style={st({ fontSize: 34, fontWeight: 800, color: openConflicts > 0 ? 'var(--err)' : 'var(--t3)', letterSpacing: '-0.06em', lineHeight: 1 })}>{openConflicts}</div>
              <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 3 })}>open conflicts</div>
            </div>
          </div>
        </div>
        <div style={st({ display: 'flex', gap: 0, marginTop: 24, borderBottom: '1px solid var(--bd)' })}>
          {([['all', 'All', liveBRD.requirements.length], ['traced', 'Traced', tracedCount]] as const).map(([k, label, count]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={st({ padding: '8px 16px', background: 'none', border: 'none', borderBottom: filter === k ? '2px solid var(--t1)' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: filter === k ? 700 : 500, color: filter === k ? 'var(--t1)' : 'var(--t3)', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6 })}
            >
              {label}
              <span style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t3)' })}>{count}</span>
            </button>
          ))}
          <Btn v="ghost" sm onClick={() => setView('document')}><Ico n="arrow-l" s={12} c="var(--t2)" /> Back to document</Btn>
        </div>
      </div>

      {/* Body */}
      <div style={st({ flex: 1, overflowY: 'auto', padding: '20px 52px 70px' })}>
        {reqs.length === 0 ? (
          <div style={st({ paddingTop: 60, textAlign: 'center', color: 'var(--t3)', fontSize: 14 })}>No requirements in this BRD.</div>
        ) : (
          <div style={st({ borderTop: '1px solid var(--bd)' })}>
            {reqs.map(r => (
              <LiveTraceRow key={r.id} id={r.id} text={r.text} author={r.author} quote={r.sourceQuote} ts={r.timestamp} />
            ))}
          </div>
        )}
        <div style={st({ marginTop: 26, fontSize: 12, color: 'var(--t3)', display: 'flex', gap: 8, alignItems: 'center' })}>
          <span style={st({ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)' })} />
          Every requirement above is traced live to its source quote, author, and timestamp from “{liveBRD.title}”.
        </div>
      </div>
    </div>
  )
}
