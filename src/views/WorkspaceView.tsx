import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS, DOCUMENTS, DOC_META } from '../data'
import { Ico } from '../components/ui/Icon'
import { Avatar, AvatarRow } from '../components/ui/Avatar'
import { Btn } from '../components/ui/Button'
import { DocTag } from '../components/ui/DocTag'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'
import type { DocType, IcoName } from '../types'

const STATUS_COLOR: Record<string, string> = {
  final: 'var(--ok)',
  review: 'var(--ac)',
  draft: 'var(--t3)',
}
const STATUS_BG: Record<string, string> = {
  final: 'rgba(78,173,121,0.12)',
  review: 'rgba(245,166,35,0.12)',
  draft: 'var(--bd)',
}

function DocRow({ doc, onClick }: { doc: typeof DOCUMENTS[0]; onClick: () => void }) {
  const m = DOC_META[doc.type]
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={st({
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        gap: 0,
        width: '100%',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--bd)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
      })}
    >
      {/* Title + meta */}
      <div style={st({ padding: '14px 18px', minWidth: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 })}>
          <div style={st({ width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0 })} />
          <DocTag type={doc.type} size="xs" />
          {doc.ai && (
            <span style={st({ fontSize: 9.5, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '1px 5px', borderRadius: 4 })}>AI</span>
          )}
        </div>
        <div style={st({ fontSize: 14, fontWeight: 600, color: hover ? 'var(--ac)' : 'var(--t1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 15, transition: 'color 120ms' })}>
          {doc.title}
        </div>
        <div style={st({ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 15 })}>
          {doc.reqs > 0 && <span>{doc.reqs} reqs extracted</span>}
          {doc.conflicts > 0 && (
            <>
              <span style={st({ color: 'var(--bd2)' })}>·</span>
              <span style={st({ color: 'var(--err)', display: 'flex', alignItems: 'center', gap: 3 })}>
                <Ico n="warning" s={10} c="var(--err)" /> {doc.conflicts} conflict{doc.conflicts > 1 ? 's' : ''}
              </span>
            </>
          )}
          {doc.ai && (
            <>
              <span style={st({ color: 'var(--bd2)' })}>·</span>
              <span style={st({ color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 })}>
                <Ico n="slack" s={10} c="var(--t3)" /> <Ico n="jira" s={10} c="var(--t3)" /> sourced
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={st({ padding: '0 12px' })}>
        <span style={st({ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[doc.status] || 'var(--t3)', background: STATUS_BG[doc.status] || 'var(--bd)', padding: '3px 9px', borderRadius: 20, textTransform: 'capitalize', whiteSpace: 'nowrap' })}>
          {doc.status}
        </span>
      </div>

      {/* Author + contrib */}
      <div style={st({ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 })}>
        <Avatar uid={doc.author} size={20} />
        {doc.contrib.length > 0 && <AvatarRow uids={doc.contrib} size={18} />}
      </div>

      {/* Time + version */}
      <div style={st({ padding: '0 18px 0 0', textAlign: 'right', whiteSpace: 'nowrap' })}>
        <div style={st({ fontSize: 12, color: 'var(--t2)' })}>{doc.when}</div>
        <div className="mono" style={st({ fontSize: 10.5, color: 'var(--t3)' })}>v{doc.v}</div>
      </div>
    </button>
  )
}

export function WorkspaceView() {
  const { setView, activeProjectId, setGenOpen, liveBRD, setActiveDocId } = useApp()
  const proj = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]
  const allDocs = DOCUMENTS.filter(d => d.pid === proj.id)
  const [filter, setFilter] = useState<'all' | DocType>('all')
  const filtered = filter === 'all' ? allDocs : allDocs.filter(d => d.type === filter)

  // Sample rows have no live counterpart — open the real live chain when it
  // exists, otherwise send the user to the generator instead of an empty viewer.
  const openDocSurface = () => {
    if (liveBRD) { setActiveDocId(liveBRD.id); setView('document') }
    else setGenOpen(true)
  }

  const tabs = (['all', 'brd', 'prd', 'spec', 'stories', 'roadmap', 'research'] as ('all' | DocType)[])
    .map(t => ({
      key: t,
      label: t === 'all' ? 'All' : DOC_META[t as DocType].label,
      count: t === 'all' ? allDocs.length : allDocs.filter(d => d.type === t).length,
      color: t === 'all' ? 'var(--t2)' : DOC_META[t as DocType].color,
      icon: t === 'all' ? null : DOC_META[t as DocType].icon,
    }))
    .filter(t => t.count > 0 || t.key === 'all')

  const gradientStart = proj.gradient.includes('(') ? proj.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#F5A623' : '#F5A623'

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>

      {/* Project header — stripped down, not a gradient banner */}
      <div style={st({ flexShrink: 0, background: 'var(--bg)', borderBottom: '1px solid var(--bd)' })}>
        <div style={st({ padding: '22px 28px 0' })}>
          <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 })}>
            <div>
              <h1 className="bri" style={st({ fontSize: 24, fontWeight: 800, color: 'var(--t1)', margin: '0 0 4px', letterSpacing: '-0.04em' })}>
                {proj.name}
              </h1>
              <p style={st({ fontSize: 13, color: 'var(--t2)', margin: '0 0 14px', maxWidth: 480 })}>{proj.desc}</p>

              {/* Stats inline */}
              <div style={st({ display: 'flex', gap: 0 })}>
                {[
                  { n: String(proj.reqs), l: 'requirements', c: 'var(--t1)' },
                  { n: String(proj.conflicts), l: 'conflicts', c: proj.conflicts > 0 ? 'var(--err)' : 'var(--t3)' },
                  { n: String(allDocs.length), l: 'documents', c: 'var(--t1)' },
                ].map(({ n, l, c }, i) => (
                  <div key={l} style={st({ paddingRight: 20, marginRight: 20, borderRight: i < 2 ? '1px solid var(--bd)' : undefined })}>
                    <div className="bri" style={st({ fontSize: 22, fontWeight: 800, color: c, letterSpacing: '-0.05em', lineHeight: 1 })}>{n}</div>
                    <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 2 })}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={st({ display: 'flex', gap: 6, paddingTop: 2 })}>
              <Btn v="ghost" sm onClick={() => setView('graph')}><Ico n="network" s={12} c="var(--t2)" /> Graph</Btn>
              {proj.conflicts > 0 && (
                <Btn v="danger" sm onClick={() => setView('conflicts')}><Ico n="warning" s={12} c="var(--err)" /> {proj.conflicts} conflicts</Btn>
              )}
              <Btn v="primary" sm onClick={() => setGenOpen(true)}><Ico n="sparkle" s={12} c="#0F0F0E" /> Generate with Trace</Btn>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={st({ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 28px', overflowX: 'auto' })}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key as 'all' | DocType)}
              style={st({
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 8,
                border: '1.5px solid',
                borderColor: filter === t.key ? `${t.color}50` : 'transparent',
                background: filter === t.key ? `${t.color}12` : 'none',
                color: filter === t.key ? t.color : 'var(--t3)',
                fontSize: 12.5, fontWeight: filter === t.key ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit', transition: 'all 0.12s',
              })}
            >
              {t.icon && <Ico n={t.icon as IcoName} s={11} c={filter === t.key ? t.color : undefined} />}
              {t.label}
              <span style={st({ fontSize: 11, opacity: 0.65 })}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Doc list */}
      <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>
        {filtered.length === 0 ? (
          <div style={st({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center' })}>
            <Trace size={64} mood="thinking" />
            <p className="bri" style={st({ fontSize: 18, fontWeight: 700, color: 'var(--t1)', margin: '18px 0 6px' })}>Nothing here yet</p>
            <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 20px' })}>
              No {filter === 'all' ? 'documents' : DOC_META[filter as DocType].label + 's'} in this project yet.
            </p>
            <Btn v="primary" onClick={() => setGenOpen(true)}><Ico n="sparkle" s={14} c="#0F0F0E" /> Generate with Trace</Btn>
          </div>
        ) : (
          <div style={st({ background: 'var(--bg)', margin: '16px 20px', borderRadius: 12, border: '1px solid var(--bd)', overflow: 'hidden' })}>
            {/* Table header */}
            <div style={st({
              display: 'grid', gridTemplateColumns: '1fr auto auto auto',
              padding: '7px 0', borderBottom: '1px solid var(--bd)',
              background: 'var(--bd)',
            })}>
              <div style={st({ padding: '0 18px', fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' })}>Document</div>
              <div style={st({ padding: '0 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' })}>Status</div>
              <div style={st({ padding: '0 16px', fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' })}>Team</div>
              <div style={st({ padding: '0 18px 0 0', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' })}>Modified</div>
            </div>
            {filtered.map(doc => (
              <DocRow key={doc.id} doc={doc} onClick={openDocSurface} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
