import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS, INTEGRATIONS_DATA } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { st } from '../lib/utils'

export function IntegrationsView() {
  const { activeProjectId } = useApp()
  const proj = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]
  const [syncing, setSyncing] = useState<Set<string>>(new Set())
  const [connected, setConnected] = useState<Set<string>>(
    new Set(INTEGRATIONS_DATA.filter(i => i.on).map(i => i.id))
  )

  const triggerSync = (id: string) => {
    setSyncing(p => new Set([...p, id]))
    setTimeout(() => setSyncing(p => { const n = new Set(p); n.delete(id); return n }), 2500)
  }

  const connectedList = INTEGRATIONS_DATA.filter(i => connected.has(i.id))
  const availableList  = INTEGRATIONS_DATA.filter(i => !connected.has(i.id))
  const totalItems = connectedList.reduce((s, i) => s + i.syncedItems, 0)
  const projMappings = Object.fromEntries(proj.integrationMappings.map(m => [m.integrationId, m.resource]))

  return (
    <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

      {/* Header */}
      <div style={st({ padding: '36px 52px 32px', borderBottom: '1px solid var(--bd)', background: 'var(--bg)' })}>
        <div style={st({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 })}>
          <div>
            <h1 className="bri" style={st({ fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--t1)', margin: '0 0 5px' })}>{proj.name}</h1>
            <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: 0 })}>Data pipeline · sources Trace reads to extract requirements</p>
          </div>
          <Btn v="primary"><Ico n="plug" s={14} c="#0F0F0E" /> Add source</Btn>
        </div>

        {/* Pipeline — numbers flow left to right, no box */}
        <div style={st({ display: 'flex', alignItems: 'center', gap: 0 })}>
          {[
            { n: String(connectedList.length), label: 'sources',       color: 'var(--ai)' },
            { n: String(totalItems),           label: 'items synced',  color: 'var(--ac)' },
            { n: String(proj.reqs),            label: 'requirements',  color: 'var(--ok)' },
            { n: String(Object.values(proj.docs).reduce((s, v) => s + v, 0)), label: 'documents', color: '#5B8DEF' },
          ].map(({ n, label, color }, i) => (
            <div key={label} style={st({ display: 'flex', alignItems: 'center' })}>
              <div style={st({ paddingRight: i < 3 ? 20 : 0 })}>
                <div className="bri" style={st({ fontSize: 36, fontWeight: 800, letterSpacing: '-0.06em', color, lineHeight: 1 })}>{n}</div>
                <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 2 })}>{label}</div>
              </div>
              {i < 3 && (
                <div style={st({ display: 'flex', alignItems: 'center', gap: 0, padding: '0 12px', marginBottom: 16 })}>
                  <div style={st({ width: 20, height: 1, background: 'var(--bd2)' })} />
                  <Ico n="arrow-r" s={12} c="var(--t3)" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={st({ padding: '36px 52px' })}>

        {/* Connected integrations — rows, not cards */}
        {connectedList.length > 0 && (
          <div style={st({ marginBottom: 48 })}>
            <div style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 })}>Connected to this project</div>

            {connectedList.map((int, idx) => {
              const isSyncing = syncing.has(int.id)
              const mapping = projMappings[int.id]
              const isLast = idx === connectedList.length - 1
              return (
                <div
                  key={int.id}
                  style={st({
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center', gap: 0,
                    borderTop: '1px solid var(--bd)',
                    borderBottom: isLast ? '1px solid var(--bd)' : 'none',
                  })}
                >
                  {/* Left: icon + identity */}
                  <div style={st({ padding: '20px 0', paddingRight: 24, display: 'flex', alignItems: 'center', gap: 16 })}>
                    <div style={st({ width: 40, height: 40, borderRadius: 11, background: `${int.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                      <Ico n={int.icon} s={20} c={int.hi} />
                    </div>
                    <div>
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 })}>
                        <span style={st({ fontSize: 15, fontWeight: 700, color: 'var(--t1)' })}>{int.name}</span>
                        <div style={st({ display: 'flex', alignItems: 'center', gap: 4 })}>
                          <div style={st({ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)' })} />
                          <span style={st({ fontSize: 11, color: 'var(--ok)', fontWeight: 600 })}>{isSyncing ? 'Syncing…' : 'Connected'}</span>
                        </div>
                      </div>
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 8 })}>
                        <span style={st({ fontSize: 12, color: 'var(--t3)' })}>{int.desc}</span>
                        {mapping && (
                          <>
                            <span style={st({ color: 'var(--bd2)' })}>·</span>
                            <span style={st({ fontSize: 12, color: int.hi, display: 'flex', alignItems: 'center', gap: 4 })}>
                              <Ico n="link" s={10} c={int.hi} />{mapping}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: sync bar + timestamp */}
                  <div style={st({ padding: '20px 32px' })}>
                    <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 })}>
                      <span className="mono" style={st({ fontSize: 12, fontWeight: 700, color: 'var(--t2)' })}>{int.syncedItems} items</span>
                      <span style={st({ fontSize: 11, color: 'var(--t3)' })}>Next sync in {int.nextSync}</span>
                    </div>
                    <div style={st({ height: 3, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' })}>
                      <div style={st({ height: '100%', background: `linear-gradient(90deg, ${int.color}, ${int.hi})`, borderRadius: 3, width: '60%', transition: 'width 0.3s' })} />
                    </div>
                    <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 5 })}>Synced {int.lastSync}</div>
                  </div>

                  {/* Right: actions */}
                  <div style={st({ display: 'flex', gap: 6, alignItems: 'center', padding: '20px 0', paddingLeft: 16, flexShrink: 0 })}>
                    <button
                      onClick={() => triggerSync(int.id)}
                      style={st({ width: 32, height: 32, borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: isSyncing ? 'transform 1s linear' : 'background 0.12s', transform: isSyncing ? 'rotate(360deg)' : 'none' })}
                      title="Sync now"
                    >
                      <Ico n="refresh" s={14} c="var(--t2)" />
                    </button>
                    <Btn v="ghost" sm>Configure</Btn>
                    <Btn v="danger" sm onClick={() => setConnected(p => { const n = new Set(p); n.delete(int.id); return n })}>Disconnect</Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Available integrations — compact grid */}
        {availableList.length > 0 && (
          <div>
            <div style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 })}>Available to connect</div>

            {/* 2-col grid — but not uniform-height cards */}
            <div style={st({ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--bd)', border: '1px solid var(--bd)', borderRadius: 14, overflow: 'hidden' })}>
              {availableList.map(int => (
                <div
                  key={int.id}
                  style={st({ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', background: 'var(--bg)' })}
                >
                  <div style={st({ width: 36, height: 36, borderRadius: 10, background: `${int.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                    <Ico n={int.icon} s={17} c={int.hi} />
                  </div>
                  <div style={st({ flex: 1, minWidth: 0 })}>
                    <div style={st({ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 })}>{int.name}</div>
                    <div style={st({ fontSize: 12, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{int.desc}</div>
                  </div>
                  <Btn v="primary" sm onClick={() => setConnected(p => new Set([...p, int.id]))}>
                    <Ico n="plug" s={11} c="#0F0F0E" /> Connect
                  </Btn>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
