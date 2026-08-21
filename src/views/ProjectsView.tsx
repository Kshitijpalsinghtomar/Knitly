import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS, DOCUMENTS } from '../data'
import { Ico } from '../components/ui/Icon'
import { AvatarRow } from '../components/ui/Avatar'
import { Btn } from '../components/ui/Button'
import { st } from '../lib/utils'

const PROJ_COLOR: Record<string, string> = { p1: '#F5A623', p2: '#5B8DEF', p3: '#E05F6A' }

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--ok)',
  draft: 'var(--t3)',
  review: 'var(--ac)',
  archived: 'var(--t3)',
}

function ProjectRow({ p, totalDocs, onClick }: {
  p: typeof PROJECTS[0]
  totalDocs: number
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const accent = PROJ_COLOR[p.id] || 'var(--ac)'
  const statusColor = STATUS_COLOR[p.status] || 'var(--t3)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        display: 'flex', alignItems: 'flex-start',
        width: '100%', gap: 0,
        background: 'transparent', border: 'none',
        borderBottom: '1px solid var(--bd)',
        padding: '20px 0',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      })}
    >
      {/* Color dot */}
      <span style={st({ width: 7, height: 7, borderRadius: '50%', background: accent, marginRight: 16, flexShrink: 0, marginTop: 5 })} />

      {/* Identity */}
      <div style={st({ flex: 1, minWidth: 0, paddingRight: 32 })}>
        <div style={st({ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 })}>
          <span className="bri" style={st({ fontSize: 17, fontWeight: 750, color: hov ? 'var(--ac)' : 'var(--t1)', letterSpacing: '-0.03em', transition: 'color 120ms' })}>
            {p.name}
          </span>
          <span style={st({ fontSize: 10.5, fontWeight: 600, color: statusColor, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 })}>
            {p.status}
          </span>
          {p.conflicts > 0 && (
            <span style={st({ fontSize: 10.5, fontWeight: 600, color: 'var(--err)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 })}>
              <Ico n="warning" s={9} c="var(--err)" />{p.conflicts} conflicts
            </span>
          )}
        </div>
        <p style={st({ fontSize: 12.5, color: 'var(--t3)', margin: '0 0 10px', lineHeight: 1.5, maxWidth: 460 })}>
          {p.desc}
        </p>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <AvatarRow uids={p.team} size={18} />
          <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{p.lastActivity}</span>
          {p.github && (
            <span style={st({ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 })}>
              <Ico n="github" s={10} c="var(--t3)" />{p.github}
            </span>
          )}
        </div>
      </div>

      {/* Stats — compact inline numbers */}
      <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 24, paddingTop: 2, flexShrink: 0 })}>
        <Stat n={p.reqs} label="reqs" />
        <Stat n={totalDocs} label="docs" />
        {p.conflicts > 0
          ? <Stat n={p.conflicts} label="conflicts" color="var(--err)" />
          : <span style={st({ minWidth: 42 })} />
        }
      </div>

      {/* Arrow */}
      <span style={st({ paddingTop: 4, paddingLeft: 20, opacity: hov ? 1 : 0, transition: 'opacity 120ms', flexShrink: 0 })}>
        <Ico n="arrow-r" s={13} c="var(--ac)" />
      </span>
    </button>
  )
}

function Stat({ n, label, color = 'var(--t1)' }: { n: number; label: string; color?: string }) {
  return (
    <div style={st({ textAlign: 'right', minWidth: 42 })}>
      <div className="bri" style={st({ fontSize: 20, fontWeight: 800, letterSpacing: '-0.05em', color, lineHeight: 1 })}>{n}</div>
      <div style={st({ fontSize: 10, color: 'var(--t3)', marginTop: 2 })}>{label}</div>
    </div>
  )
}

export function ProjectsView() {
  const { setView, setActiveProjectId } = useApp()
  const [newHov, setNewHov] = useState(false)
  const totalReqs = PROJECTS.reduce((s, p) => s + p.reqs, 0)
  const totalConflicts = PROJECTS.reduce((s, p) => s + p.conflicts, 0)

  return (
    <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

      {/* Header */}
      <div style={st({ padding: '36px 52px 28px', borderBottom: '1px solid var(--bd)' })}>
        <div style={st({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' })}>
          <div>
            <h1 className="bri" style={st({ fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--t1)', margin: '0 0 6px', lineHeight: 1 })}>
              Projects
            </h1>
            <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0 })}>
              {PROJECTS.length} workspaces&nbsp;·&nbsp;
              <span style={st({ color: 'var(--t1)', fontWeight: 600 })}>{totalReqs}</span> requirements
              {totalConflicts > 0 && (
                <>&nbsp;·&nbsp;<span style={st({ color: 'var(--err)', fontWeight: 600 })}>{totalConflicts} open conflicts</span></>
              )}
            </p>
          </div>
          <Btn v="primary"><Ico n="plus" s={14} c="#0F0F0E" /> New project</Btn>
        </div>
      </div>

      {/* Project list */}
      <div style={st({ padding: '4px 52px 52px' })}>
        {PROJECTS.map(p => {
          const totalDocs = DOCUMENTS.filter(d => d.pid === p.id).length
          return (
            <ProjectRow
              key={p.id}
              p={p}
              totalDocs={totalDocs}
              onClick={() => { setActiveProjectId(p.id); setView('workspace') }}
            />
          )
        })}

        {/* New project — text link style, no dashed rectangle */}
        <button
          onMouseEnter={() => setNewHov(true)}
          onMouseLeave={() => setNewHov(false)}
          style={st({
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '18px 0', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, color: newHov ? 'var(--ac)' : 'var(--t3)',
            fontWeight: 500, transition: 'color 120ms',
          })}
        >
          <Ico n="plus" s={12} c="currentColor" />
          Start a new project
        </button>
      </div>
    </div>
  )
}
