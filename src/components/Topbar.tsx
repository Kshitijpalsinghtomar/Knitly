import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { TEAM, NOTIFICATIONS_DATA } from '../data'
import { Ico } from './ui/Icon'
import { AvatarRow } from './ui/Avatar'
import { Btn } from './ui/Button'
import { Hr } from './ui/Badge'
import { Trace } from './Trace'
import { st } from '../lib/utils'
import type { View } from '../types'

const PROJECT_CRUMB_VIEWS: View[] = [
  'workspace', 'document', 'graph', 'conflicts', 'integrations', 'requirement', 'traceability',
]

const VIEW_LABEL: Partial<Record<View, string>> = {
  document:     'Document',
  graph:        'Graph',
  conflicts:    'Conflicts',
  integrations: 'Integrations',
  requirement:  'Requirement',
  traceability: 'Traceability',
}

export function Topbar() {
  const { view, setView, activeProjectId, activeReqId, aiOpen, setAiOpen, setGenOpen, liveBRD } = useApp()
  const { theme, toggle } = useTheme()
  const online = TEAM.filter(t => t.online)
  const unreadCount = NOTIFICATIONS_DATA.filter(n => !n.read).length
  const showCrumb = PROJECT_CRUMB_VIEWS.includes(view)

  // Deep breadcrumb trail: document > requirement etc. Uses the live BRD title
  // when open (never the mock project name).
  const crumbSegments: { label: string; onClick?: () => void }[] = []
  if (showCrumb) {
    crumbSegments.push({
      label: liveBRD?.title || 'Documents',
      onClick: () => setView('workspace'),
    })
    if (view === 'document') {
      crumbSegments.push({ label: 'Document' })
    } else if (view === 'requirement') {
      crumbSegments.push({ label: 'Document', onClick: () => setView('document') })
      crumbSegments.push({ label: activeReqId || 'Requirement' })
    } else if (view === 'traceability') {
      crumbSegments.push({ label: 'Document', onClick: () => setView('document') })
      crumbSegments.push({ label: 'Traceability' })
    } else if (VIEW_LABEL[view]) {
      crumbSegments.push({ label: VIEW_LABEL[view]! })
    }
  }

  return (
    <div style={st({
      height: 52, background: 'var(--bg)', borderBottom: '1px solid var(--bd)',
      display: 'flex', alignItems: 'center', paddingInline: 14, gap: 10, flexShrink: 0,
    })}>

      {/* Breadcrumb / wordmark */}
      {showCrumb ? (
        <div style={st({ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bd)', borderRadius: 9, padding: '5px 10px', flexShrink: 0 })}>
          <div style={st({ width: 13, height: 13, borderRadius: 3, background: 'var(--ac)', flexShrink: 0 })} />
          {crumbSegments.map((seg, i) => (
            <span key={i} style={st({ display: 'flex', alignItems: 'center', gap: 4 })}>
              {i > 0 && <Ico n="chevron-r" s={11} c="var(--t3)" />}
              {seg.onClick ? (
                <button
                  onClick={seg.onClick}
                  style={st({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, color: 'var(--t2)' })}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}
                >
                  {seg.label}
                </button>
              ) : (
                <span style={st({ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' })}>{seg.label}</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <span className="bri" style={st({ fontSize: 14, fontWeight: 800, color: 'var(--t3)', letterSpacing: '-0.02em' })}>Ariadne</span>
      )}

      {/* Search */}
      <div style={st({ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px solid var(--bd)', borderRadius: 9, padding: '6px 11px', width: 200 })}>
        <Ico n="search" s={13} c="var(--t3)" />
        <input
          placeholder="Search everything…"
          style={st({ background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: 'var(--t1)', width: '100%', fontFamily: 'inherit' })}
        />
        <span style={st({ fontSize: 10, color: 'var(--t3)', background: 'var(--bd)', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' })}>⌘K</span>
      </div>

      <div style={st({ flex: 1 })} />

      <Btn v="primary" sm onClick={() => setGenOpen(true)}>
        <Ico n="sparkle" s={13} c="#0F0F0E" /> Generate doc
      </Btn>

      <div style={st({ display: 'flex', alignItems: 'center', gap: 7 })}>
        <AvatarRow uids={online.map(u => u.id)} size={28} />
        <span style={st({ fontSize: 11.5, color: 'var(--t3)' })}>{online.length} online</span>
      </div>

      <Hr vertical />

      {/* Notification bell — no white background */}
      <button
        onClick={() => setView('notifications')}
        style={st({ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--bd)', borderRadius: 9, padding: 7, position: 'relative', cursor: 'pointer' })}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
      >
        <Ico n="bell" s={15} c="var(--t2)" />
        {unreadCount > 0 && <div style={st({ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--err)', border: '1.5px solid var(--bg)' })} />}
      </button>

      {/* Trace toggle */}
      <button
        onClick={() => setAiOpen(!aiOpen)}
        style={st({ display: 'flex', alignItems: 'center', gap: 7, background: aiOpen ? 'var(--aid)' : 'transparent', border: `1px solid ${aiOpen ? 'rgba(155,111,232,0.4)' : 'var(--bd)'}`, borderRadius: 9, padding: '5px 11px 5px 5px', cursor: 'pointer', transition: 'all 0.15s' })}
        onMouseEnter={e => { if (!aiOpen) (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd2)' }}
        onMouseLeave={e => { if (!aiOpen) (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
      >
        <Trace size={24} mood={aiOpen ? 'thinking' : 'default'} />
        <span style={st({ fontSize: 13, fontWeight: 600, color: aiOpen ? 'var(--ai)' : 'var(--t2)' })}>Trace</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        style={st({ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--bd)', borderRadius: 9, padding: 7, cursor: 'pointer' })}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
      >
        <Ico n={theme === 'dark' ? 'sun' : 'moon'} s={15} c="var(--t2)" />
      </button>
    </div>
  )
}
