import { useEffect, useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS, DOCUMENTS, ACTIVITY, TEAM } from '../data'
import { Ico } from '../components/ui/Icon'
import { AvatarRow } from '../components/ui/Avatar'
import { Btn } from '../components/ui/Button'
import { DocTag } from '../components/ui/DocTag'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'
import type { IcoName } from '../types'

const PROJ_COLOR: Record<string, string> = { p1: '#F5A623', p2: '#5B8DEF', p3: '#E05F6A' }
const DOC_COLORS: Record<string, string> = { brd: '#F5A623', prd: '#5B8DEF', spec: '#4EAD79', stories: '#9B6FE8', roadmap: '#E05F6A', research: '#E0823A' }

type AlertItem = { icon: IcoName; text: string; sub: string; color: string; action: () => void }

/* Floating pill that auto-cycles through alerts — one signal at a time */
function FloatingAlert({ items }: { items: AlertItem[] }) {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)
  const intervalRef = useRef<number | null>(null)
  // Track which item to show — only swaps after the fade-out completes
  const [displayIdx, setDisplayIdx] = useState(0)

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Fade out content only, not the pill shell
          setContentVisible(false)
          setTimeout(() => {
            setActive(curr => {
              const next = (curr + 1) % items.length
              setDisplayIdx(next)
              return next
            })
            setProgress(0)
            setContentVisible(true)
          }, 200)
          return 100
        }
        return prev + 1.4
      })
    }, 80)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [items.length])

  const item = items[displayIdx]

  return (
    <div style={st({ padding: '0 52px 20px', flexShrink: 0 })}>
      <button
        onClick={item.action}
        style={st({
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '7px 14px 7px 10px',
          background: 'var(--sf)', border: '1px solid var(--bd)',
          borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
          color: 'var(--t1)', textAlign: 'left',
          maxWidth: '100%',
          position: 'relative', overflow: 'hidden',
        })}
        onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.background = 'var(--sf2)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.background = 'var(--sf)' }}
      >
        {/* Progress fill — always visible, transitions independently */}
        <span aria-hidden="true" style={st({
          position: 'absolute', inset: 0, left: 0, top: 0,
          width: `${progress}%`, background: item.color, opacity: 0.07,
          transition: 'width 80ms linear',
          borderRadius: 20, pointerEvents: 'none',
        })} />
        {/* Inner content fades independently — pill border/bg never flickers */}
        <span style={st({
          display: 'inline-flex', alignItems: 'center', gap: 10,
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 200ms ease',
          position: 'relative',
        })}>
          <span style={st({ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 })} />
          <span style={st({ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap' })}>{item.text}</span>
          <span style={st({ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}>— {item.sub}</span>
          <Ico n="arrow-r" s={11} c="var(--t3)" />
        </span>
      </button>
    </div>
  )
}

/* Single auto-cycling pill across all recent doc types */
function RecentDocTypePill() {
  const types = [...new Set(DOCUMENTS.map(d => d.type))]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setIdx(i => (i + 1) % types.length), 2200)
    return () => clearInterval(t)
  }, [types.length])
  return <DocTag type={types[idx]} size="xs" />
}

const VERB_COLOR: Record<string, string> = {
  resolved: 'var(--ok)',
  generated: 'var(--ai)',
  synced: 'var(--ac)',
  commented: '#9B6FE8',
  'linked PR': 'var(--t2)',
}

export function HomeView() {
  const { setView, setActiveProjectId, setGenOpen } = useApp()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const alertItems: AlertItem[] = [
    { icon: 'warning', text: '4 conflicts need sorting', sub: 'Checkout Flow v2', color: 'var(--err)', action: () => { setActiveProjectId('p1'); setView('conflicts') } },
    { icon: 'bell', text: 'James is waiting on your review', sub: 'Multi-Currency PRD · 1h ago', color: 'var(--ac)', action: () => { setActiveProjectId('p1'); setView('document') } },
    { icon: 'sparkle', text: 'Trace found 14 new requirements', sub: 'Slack sync · just now', color: 'var(--ai)', action: () => { setActiveProjectId('p1'); setView('workspace') } },
    { icon: 'check', text: 'CON-002 was resolved', sub: 'fraud latency conflict · 12m ago', color: 'var(--ok)', action: () => { setActiveProjectId('p1'); setView('conflicts') } },
  ]

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>
      <header style={st({ padding: '32px 52px 20px', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 16 })}>
            <Trace size={50} mood="wave" />
            <div>
              <h1 className="bri" style={st({ fontSize: 36, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.055em', margin: 0, lineHeight: 1 })}>{greeting}, Katrina!</h1>
              <p style={st({ fontSize: 13, color: 'var(--t2)', margin: '6px 0 0' })}>Acme Corp · {PROJECTS.length} projects connected</p>
            </div>
          </div>
          <div style={st({ display: 'flex', gap: 8, paddingTop: 4, flexShrink: 0 })}>
            <Btn v="primary" onClick={() => setGenOpen(true)}><Ico n="sparkle" s={14} c="#0F0F0E" /> Generate doc</Btn>
            <Btn v="ghost" onClick={() => setView('projects')}><Ico n="folder" s={14} c="var(--t2)" /> All projects</Btn>
          </div>
        </div>
      </header>

      <FloatingAlert items={alertItems} />

      <main style={st({ flex: 1, overflowY: 'auto' })}>
        <div className="home-layout" style={st({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 288px', minHeight: '100%' })}>

          {/* Left column */}
          <section style={st({ padding: '8px 52px 54px' })}>

            {/* Projects */}
            <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 })}>
              <span className="mono" style={st({ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Your projects</span>
              <button onClick={() => setView('projects')} style={st({ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--ac)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 })}>
                All <Ico n="arrow-r" s={11} c="var(--ac)" />
              </button>
            </div>

            <div style={st({ borderTop: '1px solid var(--bd)' })}>
              {PROJECTS.map(p => {
                const totalDocs = Object.values(p.docs).reduce((sum, v) => sum + v, 0)
                return (
                  <ProjectRow
                    key={p.id}
                    p={p}
                    totalDocs={totalDocs}
                    color={PROJ_COLOR[p.id]}
                    onClick={() => { setActiveProjectId(p.id); setView('workspace') }}
                  />
                )
              })}
            </div>

            {/* Recent documents */}
            <section style={st({ marginTop: 40 })}>
              <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 })}>
                <span className="mono" style={st({ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Recent documents</span>
                <RecentDocTypePill />
              </div>
              <div style={st({ borderTop: '1px solid var(--bd)' })}>
                {DOCUMENTS.slice(0, 5).map(doc => {
                  const project = PROJECTS.find(p => p.id === doc.pid)
                  return (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      color={DOC_COLORS[doc.type] || 'var(--t2)'}
                      onClick={() => { if (project) setActiveProjectId(project.id); setView('document') }}
                    />
                  )
                })}
              </div>
            </section>
          </section>

          {/* Right sidebar — Live activity */}
          <aside className="home-activity" style={st({ padding: '8px 24px 54px 28px', borderLeft: '1px solid var(--bd)' })}>
            <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 })}>
              <span className="mono" style={st({ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Live activity</span>
              <span style={st({ display: 'flex', alignItems: 'center', gap: 5 })}>
                <span style={st({ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--ok) 25%, transparent)' })} />
                <span style={st({ fontSize: 10, color: 'var(--t3)' })}>live</span>
              </span>
            </div>

            <div style={st({ display: 'flex', flexDirection: 'column', gap: 0 })}>
              {ACTIVITY.map((activity, index) => {
                const user = TEAM.find(m => m.id === activity.uid)!
                const verbColor = Object.entries(VERB_COLOR).find(([k]) => activity.verb.toLowerCase().startsWith(k))?.[1] || 'var(--t2)'
                const isLast = index === ACTIVITY.length - 1
                return (
                  <div key={activity.id} style={st({ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 18, position: 'relative' })}>
                    {!isLast && (
                      <span style={st({ position: 'absolute', left: 14, top: 30, bottom: 0, width: 1, background: 'var(--bd)' })} />
                    )}
                    {/* Avatar */}
                    <span style={st({
                      width: 28, height: 28, borderRadius: '50%',
                      background: user.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      flexShrink: 0, zIndex: 1,
                      border: '2px solid var(--bg)',
                    })}>
                      {user.initials}
                    </span>

                    {/* Content */}
                    <div style={st({ paddingTop: 1, minWidth: 0 })}>
                      <p style={st({ fontSize: 12.5, color: 'var(--t2)', margin: 0, lineHeight: 1.5 })}>
                        <strong style={st({ color: 'var(--t1)', fontWeight: 650 })}>{user.name}</strong>
                        {' '}
                        <span style={st({ color: verbColor, fontWeight: 500 })}>{activity.verb}</span>
                        {' '}
                        <strong style={st({ color: 'var(--t1)', fontWeight: 550 })}>{activity.obj}</strong>
                      </p>
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 })}>
                        <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{activity.proj}</span>
                        <span style={st({ width: 2, height: 2, borderRadius: '50%', background: 'var(--t3)', flexShrink: 0 })} />
                        <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Workspace stats */}
            <div style={st({ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--bd)' })}>
              <span className="mono" style={st({ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 14 })}>Workspace</span>
              <div style={st({ display: 'flex', flexDirection: 'column', gap: 10 })}>
                <StatLine label="Total requirements" value={PROJECTS.reduce((s, p) => s + p.reqs, 0)} color="var(--t1)" />
                <StatLine label="Open conflicts" value={PROJECTS.reduce((s, p) => s + p.conflicts, 0)} color="var(--err)" />
                <StatLine label="Documents" value={DOCUMENTS.length} color="var(--t1)" />
                <StatLine label="Team members" value={TEAM.length} color="var(--t1)" />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

/* Extracted project row — no full-row hover strip */
function ProjectRow({ p, totalDocs, color, onClick }: { p: (typeof PROJECTS)[0]; totalDocs: number; color: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        display: 'flex', alignItems: 'center', width: '100%',
        padding: '15px 0', background: 'transparent', border: 'none',
        borderBottom: '1px solid var(--bd)', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left', gap: 0,
      })}
    >
      <span style={st({ width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 14, flexShrink: 0 })} />
      <span style={st({ flex: 1, minWidth: 0 })}>
        <span className="bri" style={st({ display: 'block', fontSize: 15, fontWeight: 800, color: hov ? 'var(--ac)' : 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 2, transition: 'color 120ms' })}>{p.name}</span>
        <span style={st({ display: 'block', fontSize: 12, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 })}>{p.desc}</span>
      </span>
      <span style={st({ display: 'flex', alignItems: 'flex-end', gap: 20, marginRight: 20 })}>
        <BigStat n={p.reqs} label="reqs" />
        <BigStat n={totalDocs} label="docs" />
        {p.conflicts > 0
          ? <BigStat n={p.conflicts} label="conflicts" color="var(--err)" />
          : <span style={st({ minWidth: 35 })} />
        }
      </span>
      <span style={st({ display: 'flex', alignItems: 'center', gap: 8, marginRight: 10 })}>
        <AvatarRow uids={p.team} size={20} />
        <span style={st({ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' })}>{p.lastActivity}</span>
      </span>
      <Ico n="arrow-r" s={13} c={hov ? 'var(--ac)' : 'var(--t3)'} />
    </button>
  )
}

function BigStat({ n, label, color = 'var(--t1)' }: { n: number | string; label: string; color?: string }) {
  return (
    <div style={st({ textAlign: 'right', minWidth: 35 })}>
      <div className="bri" style={st({ fontSize: 24, fontWeight: 800, letterSpacing: '-0.06em', color, lineHeight: 1 })}>{n}</div>
      <div style={st({ fontSize: 10, color: 'var(--t3)', marginTop: 2 })}>{label}</div>
    </div>
  )
}

/* Extracted document row — no full-row hover strip */
function DocRow({ doc, color, onClick }: { doc: (typeof DOCUMENTS)[0]; color: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0',
        width: '100%', background: 'transparent', border: 'none',
        borderBottom: '1px solid var(--bd)', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      })}
    >
      <span style={st({ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 })} />
      <span style={st({ flex: 1, fontSize: 13.5, fontWeight: 500, color: hov ? 'var(--ac)' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 120ms' })}>{doc.title}</span>
      <DocTag type={doc.type} size="xs" />
      <span style={st({ fontSize: 11, color: 'var(--t3)', flexShrink: 0 })}>{doc.when}</span>
    </button>
  )
}

function StatLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
      <span style={st({ fontSize: 12, color: 'var(--t2)' })}>{label}</span>
      <span className="bri" style={st({ fontSize: 14, fontWeight: 700, color, letterSpacing: '-0.04em' })}>{value}</span>
    </div>
  )
}
