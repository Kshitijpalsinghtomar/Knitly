import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Ico } from './ui/Icon'
import { Avatar } from './ui/Avatar'
import { st } from '../lib/utils'
import type { View, IcoName } from '../types'

const PROJECT_VIEWS: View[] = ['workspace', 'integrations', 'graph', 'conflicts', 'traceability', 'requirement']

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

export function LeftRail() {
  const { view, setView, liveBRD } = useApp()
  const openConflicts = liveBRD?.conflicts.filter(c => !c.resolved).length ?? 0

  const inProjectView = PROJECT_VIEWS.includes(view)

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
      <RailBtn icon="folder" label="All sources"   active={view === 'projects'}  onClick={() => setView('projects')} />
      <RailBtn icon="book"   label="Knowledge base" active={view === 'knowledge'} onClick={() => setView('knowledge')} />

      {/* Divider */}
      <div style={st({ height: 1, width: 30, background: 'var(--bd)', margin: '6px 0' })} />

      {/* Document / context section */}
      <RailBtn icon="overview" label="Documents"    active={view === 'workspace'} onClick={() => { setView('workspace') }} />
      <RailBtn icon="network"  label="Graph"        active={view === 'graph'}     onClick={() => setView('graph')} />
      <RailBtn icon="warning"  label="Conflicts"    active={view === 'conflicts'} onClick={() => setView('conflicts')} badge={openConflicts} />
      <RailBtn icon="shield"   label="Traceability" active={view === 'traceability' || view === 'requirement'} onClick={() => setView('traceability')} />

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
