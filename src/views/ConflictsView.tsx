import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS, CONFLICTS_DATA, REQUIREMENTS_DETAIL } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'

export function ConflictsView() {
  const { activeProjectId, setView, setActiveReqId } = useApp()
  const proj = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]
  const [resolved, setResolved] = useState(new Set<string>())
  const [expanded, setExpanded] = useState<string | null>(CONFLICTS_DATA[0]?.id || null)
  const left = CONFLICTS_DATA.length - resolved.size

  const goToReq = (reqId: string) => {
    const hasDetail = REQUIREMENTS_DETAIL.some(r => r.id === reqId)
    if (hasDetail) { setActiveReqId(reqId); setView('requirement') }
  }

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>

      {/* Header */}
      <div style={st({ padding: '32px 52px 28px', borderBottom: '1px solid var(--bd)', background: 'var(--bg)', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 16 })}>
            <Trace size={44} mood={left === 0 ? 'done' : 'thinking'} />
            <div>
              <h1 className="bri" style={st({ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--t1)', margin: '0 0 4px' })}>
                {left === 0 ? 'All sorted.' : `${left} thing${left > 1 ? 's' : ''} to resolve`}
              </h1>
              <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0 })}>
                {left > 0
                  ? `Trace found ${CONFLICTS_DATA.length} conflicts in ${proj.name}.`
                  : 'Every conflict resolved. Ship it.'}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
            <div style={st({ textAlign: 'right', marginRight: 4 })}>
              <div className="mono" style={st({ fontSize: 16, fontWeight: 700, color: 'var(--t1)' })}>{CONFLICTS_DATA.length - left}<span style={st({ color: 'var(--t3)', fontSize: 13 })}>/{CONFLICTS_DATA.length}</span></div>
              <div style={st({ fontSize: 10, color: 'var(--t3)', marginTop: 1 })}>resolved</div>
            </div>
            <div style={st({ width: 80, height: 5, background: 'var(--bd)', borderRadius: 10, overflow: 'hidden' })}>
              <div style={st({ height: '100%', background: 'var(--ok)', borderRadius: 10, width: `${((CONFLICTS_DATA.length - left) / CONFLICTS_DATA.length) * 100}%`, transition: 'width 0.4s' })} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

        {left === 0 ? (
          <div style={st({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center' })}>
            <Trace size={64} mood="done" />
            <p className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '22px 0 8px', letterSpacing: '-0.03em' })}>Clean spec. Ship it.</p>
            <p style={st({ fontSize: 14, color: 'var(--t2)', margin: '0 0 24px' })}>No outstanding conflicts in {proj.name}.</p>
            <Btn v="ghost" onClick={() => setView('document')}><Ico n="arrow-r" s={12} c="var(--t2)" /> Back to document</Btn>
          </div>
        ) : (
          <div>
            {/* Sort: majors first */}
            {[...CONFLICTS_DATA].sort((a, b) => {
              const aResolved = resolved.has(a.id)
              const bResolved = resolved.has(b.id)
              if (aResolved !== bResolved) return aResolved ? 1 : -1
              if (a.severity !== b.severity) return a.severity === 'major' ? -1 : 1
              return 0
            }).map((c, idx) => {
              const done = resolved.has(c.id)
              const major = c.severity === 'major'
              const isExpanded = expanded === c.id && !done
              const reqAHasDetail = REQUIREMENTS_DETAIL.some(r => r.id === c.reqA)
              const reqBHasDetail = REQUIREMENTS_DETAIL.some(r => r.id === c.reqB)

              return (
                <div
                  key={c.id}
                  style={st({
                    borderBottom: '1px solid var(--bd)',
                    opacity: done ? 0.45 : 1,
                    transition: 'opacity 0.3s',
                    position: 'relative',
                  })}
                >
                  {/* Left severity accent */}
                  {!done && (
                    <div style={st({
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                      background: major ? 'var(--err)' : 'var(--warn)',
                    })} />
                  )}

                  {/* Row header — always visible */}
                  <button
                    onClick={() => !done && setExpanded(isExpanded ? null : c.id)}
                    style={st({
                      width: '100%', display: 'flex', alignItems: 'center', gap: 0,
                      padding: '18px 52px 18px 56px',
                      background: 'none', border: 'none', cursor: done ? 'default' : 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                    })}

                  >
                    {/* Severity + IDs */}
                    <div style={st({ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flexShrink: 0 })}>
                      <span style={st({ fontSize: 10.5, fontWeight: 700, color: major ? 'var(--err)' : 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.04em' })}>
                        {major ? 'Major' : 'Minor'}
                      </span>
                      <span style={st({ color: 'var(--bd2)' })}>·</span>
                      <button
                        onClick={e => { e.stopPropagation(); goToReq(c.reqA) }}
                        className="mono"
                        style={st({ fontSize: 11, color: reqAHasDetail ? 'var(--ac)' : 'var(--t3)', fontWeight: 700, background: 'var(--bg)', padding: '2px 7px', borderRadius: 5, border: 'none', cursor: reqAHasDetail ? 'pointer' : 'default', fontFamily: 'var(--font-mono, monospace)', textDecoration: reqAHasDetail ? 'underline' : 'none', textDecorationStyle: 'dotted' })}
                      >
                        {c.reqA}
                      </button>
                      <span style={st({ fontSize: 11, color: 'var(--t3)' })}>↔</span>
                      <button
                        onClick={e => { e.stopPropagation(); goToReq(c.reqB) }}
                        className="mono"
                        style={st({ fontSize: 11, color: reqBHasDetail ? 'var(--ac)' : 'var(--t3)', fontWeight: 700, background: 'var(--bg)', padding: '2px 7px', borderRadius: 5, border: 'none', cursor: reqBHasDetail ? 'pointer' : 'default', fontFamily: 'var(--font-mono, monospace)', textDecoration: reqBHasDetail ? 'underline' : 'none', textDecorationStyle: 'dotted' })}
                      >
                        {c.reqB}
                      </button>
                    </div>

                    {/* Title */}
                    <div style={st({ flex: 1, paddingRight: 24 })}>
                      <div style={st({ fontSize: 14, fontWeight: 600, color: done ? 'var(--t3)' : 'var(--t1)', letterSpacing: '-0.01em', lineHeight: 1.4 })}>{c.title}</div>
                    </div>

                    {/* Right: status or expand */}
                    <div style={st({ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 })}>
                      {done
                        ? <span style={st({ fontSize: 12, fontWeight: 600, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 4 })}><Ico n="check" s={12} c="var(--ok)" /> Resolved</span>
                        : !isExpanded
                          ? <span style={st({ fontSize: 11.5, color: 'var(--ac)', fontWeight: 600 })}>Review fix →</span>
                          : <Ico n="chevron-d" s={12} c="var(--t3)" />
                      }
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={st({ padding: '0 52px 28px 56px' })}>

                      {/* Description */}
                      <p style={st({ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.75, margin: '0 0 20px', maxWidth: 680 })}>{c.desc}</p>

                      {/* Trace's suggestion — inline, no card */}
                      <div style={st({ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 22, paddingLeft: 0 })}>
                        <Trace size={24} mood="excited" />
                        <div style={st({ flex: 1, maxWidth: 640 })}>
                          <div style={st({ fontSize: 10.5, fontWeight: 700, color: major ? 'var(--ac)' : 'var(--ok)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 })}>Trace suggests</div>
                          <p style={st({ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.7, margin: 0 })}>{c.fix}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={st({ display: 'flex', gap: 8, alignItems: 'center' })}>
                        <Btn v="primary" onClick={() => { setResolved(new Set([...resolved, c.id])); setExpanded(null) }}>
                          <Ico n="check" s={12} c="#0F0F0E" /> Mark as resolved
                        </Btn>
                        <Btn v="ghost" onClick={() => setView('document')}>
                          <Ico n="doc" s={12} c="var(--t2)" /> Open document
                        </Btn>
                        {(reqAHasDetail || reqBHasDetail) && (
                          <button
                            onClick={() => { goToReq(reqAHasDetail ? c.reqA : c.reqB) }}
                            style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--ac)', fontWeight: 600, fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 4 })}
                          >
                            View requirement chain <Ico n="arrow-r" s={11} c="var(--ac)" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
