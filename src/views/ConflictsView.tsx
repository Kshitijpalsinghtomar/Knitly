import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { resolveConflict as persistBRDConflict } from '../lib/api'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'

export function ConflictsView() {
  const { liveBRD, setLiveBRD, setView, cancelDocument } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (!liveBRD) {
    return (
      <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 6 })}>
        <Trace size={64} mood="thinking" />
        <p className="bri" style={st({ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: '18px 0 6px', letterSpacing: '-0.03em' })}>Open a document first</p>
        <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 20px', maxWidth: 400, textAlign: 'center' })}>
          Conflicts live inside each generated BRD. Open one from your documents to review and resolve its conflicts.
        </p>
        <Btn v="primary" onClick={cancelDocument}><Ico n="folder" s={12} c="#0F0F0E" /> Browse documents</Btn>
      </div>
    )
  }

  const open = liveBRD.conflicts.filter(c => !c.resolved)
  const done = liveBRD.conflicts.length - open.length

  const resolve = async (id: string, val: boolean) => {
    setBusy(id)
    try {
      const updated = await persistBRDConflict(liveBRD.id, id, val)
      setLiveBRD(updated)
    } catch {
      /* server truth wins on next load */
    }
    setBusy(null)
  }

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>
      {/* Header */}
      <div style={st({ padding: '32px 52px 28px', borderBottom: '1px solid var(--bd)', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 16 })}>
            <Trace size={44} mood={open.length === 0 ? 'done' : 'thinking'} />
            <div>
              <h1 className="bri" style={st({ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--t1)', margin: '0 0 4px' })}>
                {open.length === 0 ? 'All sorted.' : `${open.length} thing${open.length > 1 ? 's' : ''} to resolve`}
              </h1>
              <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0 })}>
                Trace found {liveBRD.conflicts.length} conflicts in “{liveBRD.title}” — resolved {done}/{liveBRD.conflicts.length}.
              </p>
            </div>
          </div>
          <Btn v="ghost" sm onClick={() => setView('document')}><Ico n="arrow-l" s={12} c="var(--t2)" /> Back to document</Btn>
        </div>
      </div>

      {/* Body */}
      <div style={st({ flex: 1, overflowY: 'auto' })}>
        {liveBRD.conflicts.length === 0 ? (
          <div style={st({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center' })}>
            <Trace size={64} mood="done" />
            <p className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '22px 0 8px', letterSpacing: '-0.03em' })}>Clean spec.</p>
            <p style={st({ fontSize: 14, color: 'var(--t2)', margin: '0 0 24px' })}>No conflicts detected in “{liveBRD.title}”.</p>
            <Btn v="ghost" onClick={() => setView('document')}><Ico n="arrow-r" s={12} c="var(--t2)" /> Back to document</Btn>
          </div>
        ) : (
          [...liveBRD.conflicts].sort((a, b) => {
            if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
            return a.severity === 'major' ? -1 : 1
          }).map(c => {
            const isExpanded = expanded === c.id && !c.resolved
            return (
              <div key={c.id} style={st({ borderBottom: '1px solid var(--bd)', opacity: c.resolved ? 0.5 : 1, position: 'relative' })}>
                {!c.resolved && (
                  <div style={st({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.severity === 'major' ? 'var(--err)' : 'var(--warn)' })} />
                )}
                <button
                  onClick={() => !c.resolved && setExpanded(isExpanded ? null : c.id)}
                  style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 52px 18px 56px', background: 'none', border: 'none', cursor: c.resolved ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left' })}
                >
                  <span style={st({ fontSize: 10.5, fontWeight: 700, color: c.severity === 'major' ? 'var(--err)' : 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 })}>{c.severity}</span>
                  <span className="mono" style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t3)', flexShrink: 0 })}>{c.id}</span>
                  <span style={st({ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap', flexShrink: 0 })}>{c.reqA} ↔ {c.reqB}</span>
                  <span style={st({ flex: 1, fontSize: 14, fontWeight: 600, color: c.resolved ? 'var(--t3)' : 'var(--t1)', lineHeight: 1.4 })}>{c.title}</span>
                  {c.resolved
                    ? <span style={st({ fontSize: 12, fontWeight: 600, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 })}><Ico n="check" s={12} c="var(--ok)" /> Resolved</span>
                    : <Ico n={isExpanded ? 'chevron-d' : 'chevron-r'} s={12} c="var(--t3)" />}
                </button>
                {isExpanded && (
                  <div style={st({ padding: '0 52px 30px 56px' })}>
                    <p style={st({ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.75, margin: '0 0 20px', maxWidth: 680 })}>{c.desc}</p>
                    <div style={st({ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 22 })}>
                      <Trace size={24} mood="excited" />
                      <div style={st({ flex: 1, maxWidth: 640, fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.7 })}><strong style={st({ fontWeight: 600, color: 'var(--t1)' })}>Fix:</strong> {c.fix}</div>
                    </div>
                    <div style={st({ display: 'flex', gap: 8 })}>
                      <Btn v="primary" disabled={busy === c.id} onClick={() => resolve(c.id, true)}>
                        {busy === c.id ? <Trace size={14} mood="thinking" /> : <Ico n="check" s={12} c="#0F0F0E" />} Mark as resolved
                      </Btn>
                      <Btn v="ghost" onClick={() => setView('document')}><Ico n="doc" s={12} c="var(--t2)" /> Open document</Btn>
                    </div>
                  </div>
                )}
                {c.resolved && (
                  <button onClick={() => resolve(c.id, false)} style={st({ margin: '0 0 12px 56px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--t3)', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted' })}>Reopen</button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
