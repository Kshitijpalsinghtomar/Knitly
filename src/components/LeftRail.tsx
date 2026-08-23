import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS } from '../data'
import { Ico } from './ui/Icon'
import { Avatar } from './ui/Avatar'
import { st } from '../lib/utils'
import type { IcoName } from '../types'

function RailBtn({ icon, label, active, onClick, badge }: {
  icon: IcoName; label: string; active: boolean; onClick: () => void; badge?: number
}) {
  const [tip, setTip] = useState(false)
  return (
    <div style={st({ position: 'relative' })} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <button
        onClick={onClick}
        style={st({
          width: 40, height: 40, borderRadius: 11,
          background: active ? 'var(--acd)' : 'transparent',
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.12s',
          color: active ? 'var(--ac)' : 'var(--t3)',
        })}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--bd)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)' } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)' } }}
      >
        <Ico n={icon} s={18} c={active ? 'var(--ac)' : undefined} />
        {!!badge && badge > 0 && (
          <div style={st({ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--err)', border: '1.5px solid var(--bg)' })} />
        )}
      </button>
      {tip && (
        <div style={st({ position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)', background: 'var(--sf)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap', zIndex: 200, boxShadow: 'var(--sh)', pointerEvents: 'none' })}>
          {label}
        </div>
      )}
    </div>
  )
}

function ProjectPicker() {
  const { activeProjectId, setActiveProjectId, setView } = useApp()
  const [open, setOpen] = useState(false)
  const active = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]

  const pick = (id: string) => {
    setActiveProjectId(id)
    setView('workspace')
    setOpen(false)
  }

  return (
    <div style={st({ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' })}>
      <button
        onClick={() => setOpen(o => !o)}
        title={active.name}
        style={st({
          width: 40, height: 40, borderRadius: 11, background: active.gradient,
          border: open ? '2px solid var(--ac)' : '2px solid transparent',
          cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        })}
      >
        <Ico n="chevron-d" s={12} c="rgba(255,255,255,0.8)" />
      </button>

      {open && (
        <div
          className="project-picker-dropdown"
          style={st({
            position: 'absolute', left: 'calc(100% + 8px)', top: 0,
            background: 'var(--sf)', border: '1.5px solid var(--bd2)',
            borderRadius: 14, padding: 8, zIndex: 300,
            boxShadow: 'var(--sh2)', minWidth: 200,
          })}
        >
          <p style={st({ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', margin: '4px 8px 8px' })}>
            Switch project
          </p>
          {PROJECTS.map(p => (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              style={st({
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 10px', borderRadius: 10,
                background: p.id === activeProjectId ? 'var(--acd)' : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', transition: 'background 0.1s',
              })}
              onMouseEnter={e => { if (p.id !== activeProjectId) (e.currentTarget as HTMLElement).style.background = 'var(--bd)' }}
              onMouseLeave={e => { if (p.id !== activeProjectId) (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              <div style={st({ width: 28, height: 28, borderRadius: 8, background: p.gradient, flexShrink: 0 })} />
              <div>
                <div style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.2 })}>{p.name}</div>
                <div style={st({ fontSize: 11, color: 'var(--t3)', textTransform: 'capitalize' })}>{p.status}</div>
              </div>
              {p.id === activeProjectId && <Ico n="check" s={13} c="var(--ac)" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LeftRail() {
  const { view, setView, activeProjectId } = useApp()
  const activeProject = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]

  return (
    <div style={st({
      width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', background: 'var(--bg)',
      borderRight: '1px solid var(--bd)', padding: '10px 0', gap: 3,
    })}>
      {/* Logo */}
      <button
        onClick={() => setView('home')}
        style={st({
          width: 38, height: 38, borderRadius: 11, background: 'var(--ac)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', marginBottom: 14, flexShrink: 0,
        })}
      >
        <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
          <rect x="0.5" y="0.5" width="4.5" height="4.5" rx="1.2" fill="#0F0F0E" fillOpacity="0.85" />
          <rect x="7" y="0.5" width="4.5" height="4.5" rx="1.2" fill="#0F0F0E" fillOpacity="0.5" />
          <rect x="0.5" y="7" width="4.5" height="4.5" rx="1.2" fill="#0F0F0E" fillOpacity="0.5" />
          <rect x="7" y="7" width="4.5" height="4.5" rx="1.2" fill="#0F0F0E" fillOpacity="0.25" />
        </svg>
      </button>

      {/* Global nav */}
      <RailBtn icon="home"   label="Home"          active={view === 'home'}      onClick={() => setView('home')} />
      <RailBtn icon="folder" label="All projects"  active={view === 'projects'}  onClick={() => setView('projects')} />
      <RailBtn icon="book"   label="Knowledge base" active={view === 'knowledge'} onClick={() => setView('knowledge')} />

      {/* Divider */}
      <div style={st({ height: 1, width: 30, background: 'var(--bd)', margin: '6px 0' })} />

      {/* Project section */}
      <ProjectPicker />
      <RailBtn icon="overview" label="Project docs"  active={view === 'workspace' || view === 'document'}    onClick={() => { setView('workspace') }} />
      <RailBtn icon="plug"     label="Integrations"  active={view === 'integrations'} onClick={() => setView('integrations')} />
      <RailBtn icon="network"  label="Graph"         active={view === 'graph'}        onClick={() => setView('graph')} />
      <RailBtn icon="warning"  label="Conflicts"     active={view === 'conflicts'}    onClick={() => setView('conflicts')} badge={activeProject.conflicts} />
      <RailBtn icon="shield"   label="Traceability"  active={view === 'traceability' || view === 'requirement'}  onClick={() => setView('traceability')} />

      {/* Bottom */}
      <div style={st({ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 })}>
        <div style={st({ height: 1, width: 30, background: 'var(--bd)', marginBottom: 6 })} />
        <RailBtn icon="users"    label="Team"     active={view === 'team'}     onClick={() => setView('team')} />
        <RailBtn icon="settings" label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
        <div style={st({ marginTop: 4 })}><Avatar uid="u1" size={30} /></div>
      </div>
    </div>
  )
}
