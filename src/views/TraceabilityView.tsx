import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { REQUIREMENTS_DETAIL, ORPHAN_PRS, TEAM_DATA, PROJECTS } from '../data'
import { Ico } from '../components/ui/Icon'
import { st } from '../lib/utils'

type Filter = 'all' | 'contradicted' | 'unlinked' | 'in-sync'

const STATUS_DOT: Record<string, string> = {
  'in-sync':     'var(--ok)',
  'stale':       'var(--warn)',
  'contradicted':'var(--err)',
  'unlinked':    'var(--t3)',
}

function ReqRow({ id, title, status, prNum, prTitle, onClick, action }: {
  id: string; title: string; status: string; prNum?: number; prTitle?: string;
  onClick: () => void; action?: { label: string; icon: 'link' | 'arrow-r' }
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', borderBottom: '1px solid var(--bd)',
        cursor: 'pointer', transition: 'background 0.12s',
        background: hov ? 'var(--sf)' : 'none',
        margin: '0 -16px',
      })}
      onClick={onClick}
    >
      {/* Status dot */}
      <div style={st({ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[status] || 'var(--t3)', flexShrink: 0 })} />

      {/* ID */}
      <span className="mono" style={st({ fontSize: 12, fontWeight: 700, color: 'var(--t3)', flexShrink: 0, width: 60 })}>{id}</span>

      {/* Title */}
      <span style={st({ fontSize: 13, color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
        {title}
      </span>

      {/* PR reference */}
      {prNum && (
        <span className="mono" style={st({ fontSize: 11.5, color: 'var(--t3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 })}>
          <Ico n="github" s={11} c="var(--t3)" /> #{prNum}
          {status === 'in-sync' && <Ico n="check" s={11} c="var(--ok)" />}
          {status === 'contradicted' && <Ico n="warning" s={11} c="var(--err)" />}
        </span>
      )}

      {/* Action */}
      <div style={st({ opacity: hov ? 1 : 0, transition: 'opacity 0.12s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ac)', fontWeight: 600, flexShrink: 0 })}>
        {action ? (
          <>
            <Ico n={action.icon} s={12} c="var(--ac)" /> {action.label}
          </>
        ) : (
          <>View <Ico n="arrow-r" s={12} c="var(--ac)" /></>
        )}
      </div>
    </div>
  )
}

function PRRow({ pr, title, authorId, mergedAt, onClick }: {
  pr: number; title: string; authorId: string; mergedAt: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const author = TEAM_DATA.find(t => t.id === authorId)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={st({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', borderBottom: '1px solid var(--bd)',
        cursor: 'pointer', transition: 'background 0.12s',
        background: hov ? 'var(--sf)' : 'none',
        margin: '0 -16px',
      })}
      onClick={onClick}
    >
      <div style={st({ width: 7, height: 7, borderRadius: '50%', background: 'var(--t3)', flexShrink: 0 })} />
      <span className="mono" style={st({ fontSize: 12, fontWeight: 700, color: 'var(--t3)', flexShrink: 0, width: 60 })}>#{pr}</span>
      <span style={st({ fontSize: 13, color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{title}</span>
      <span style={st({ fontSize: 11.5, color: 'var(--t3)', flexShrink: 0 })}>
        {author?.name} · {mergedAt}
      </span>
      <div style={st({ opacity: hov ? 1 : 0, transition: 'opacity 0.12s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ac)', fontWeight: 600 })}>
        <Ico n="link" s={12} c="var(--ac)" /> Link req
      </div>
    </div>
  )
}

export function TraceabilityView() {
  const { activeProjectId, setView, setActiveReqId } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const proj = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]
  // Linking an undocumented PR back to a requirement has no backend flow yet —
  // give honest feedback instead of a dead click.
  const [notice, setNotice] = useState<string | null>(null)
  const soon = (what: string) => { setNotice(what); setTimeout(() => setNotice(null), 2600) }

  const reqs = REQUIREMENTS_DETAIL.filter(r => r.pid === activeProjectId)
  const contradicted = reqs.filter(r => r.status === 'contradicted')
  const stale = reqs.filter(r => r.status === 'stale')
  const unlinked = reqs.filter(r => r.status === 'unlinked')
  const inSync = reqs.filter(r => r.status === 'in-sync')

  const goToReq = (id: string) => {
    setActiveReqId(id)
    setView('requirement')
  }

  const filterTabs: { key: Filter; label: string; count: number; color?: string }[] = [
    { key: 'all',          label: 'All',          count: reqs.length },
    { key: 'contradicted', label: 'Contradicted',  count: contradicted.length + stale.length, color: 'var(--err)' },
    { key: 'unlinked',     label: 'No code',       count: unlinked.length + ORPHAN_PRS.length },
    { key: 'in-sync',      label: 'In sync',       count: inSync.length, color: 'var(--ok)' },
  ]

  const showContradicted = filter === 'all' || filter === 'contradicted'
  const showUnlinked = filter === 'all' || filter === 'unlinked'
  const showInSync = filter === 'all' || filter === 'in-sync'

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>

      {/* Header */}
      <div style={st({ padding: '36px 52px 0', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 })}>
          <div>
            <div style={st({ fontSize: 11, color: 'var(--t3)', marginBottom: 6 })}>{proj.name}</div>
            <h1 className="bri" style={st({ fontSize: 38, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.05em', margin: 0, lineHeight: 1 })}>
              Code Traceability
            </h1>
          </div>

          {/* Summary numbers */}
          <div style={st({ display: 'flex', gap: 32, alignItems: 'flex-end' })}>
            <div style={st({ textAlign: 'right' })}>
              <div className="bri" style={st({ fontSize: 36, fontWeight: 800, color: 'var(--err)', letterSpacing: '-0.06em', lineHeight: 1 })}>{contradicted.length + stale.length}</div>
              <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 3 })}>need attention</div>
            </div>
            <div style={st({ textAlign: 'right' })}>
              <div className="bri" style={st({ fontSize: 36, fontWeight: 800, color: 'var(--t3)', letterSpacing: '-0.06em', lineHeight: 1 })}>{unlinked.length}</div>
              <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 3 })}>no code yet</div>
            </div>
            <div style={st({ textAlign: 'right' })}>
              <div className="bri" style={st({ fontSize: 36, fontWeight: 800, color: 'var(--ok)', letterSpacing: '-0.06em', lineHeight: 1 })}>{inSync.length}</div>
              <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 3 })}>in sync</div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={st({ display: 'flex', gap: 0, marginTop: 32, borderBottom: '1px solid var(--bd)' })}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={st({
                padding: '8px 16px', background: 'none', border: 'none',
                borderBottom: filter === tab.key ? '2px solid var(--t1)' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: filter === tab.key ? 700 : 500,
                color: filter === tab.key ? 'var(--t1)' : 'var(--t3)',
                transition: 'all 0.12s', marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 6,
              })}
            >
              {tab.label}
              <span style={st({
                fontSize: 11, fontWeight: 700,
                color: filter === tab.key ? (tab.color || 'var(--t2)') : 'var(--t3)',
              })}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={st({ flex: 1, overflowY: 'auto', padding: '0 52px 80px' })}>

        {/* Contradicted section */}
        {showContradicted && (contradicted.length > 0 || stale.length > 0) && (
          <div style={st({ marginTop: 40 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 })}>
              <Ico n="warning" s={13} c="var(--err)" />
              <span style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--err)' })}>
                Contradicted — code doesn't match requirement
              </span>
            </div>
            {contradicted.map(r => (
              <ReqRow
                key={r.id}
                id={r.id}
                title={r.title}
                status={r.status}
                prNum={r.code?.pr}
                prTitle={r.code?.prTitle}
                onClick={() => goToReq(r.id)}
              />
            ))}
            {stale.map(r => (
              <ReqRow
                key={r.id}
                id={r.id}
                title={r.title}
                status="stale"
                onClick={() => goToReq(r.id)}
              />
            ))}
          </div>
        )}

        {/* Orphan code — PRs with no requirement */}
        {showUnlinked && ORPHAN_PRS.length > 0 && (
          <div style={st({ marginTop: 48 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 })}>
              <Ico n="code" s={13} c="var(--t3)" />
              <span style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)' })}>
                Undocumented code — PRs with no linked requirement
              </span>
            </div>
            {ORPHAN_PRS.map(p => (
              <PRRow
                key={p.pr}
                pr={p.pr}
                title={p.title}
                authorId={p.authorId}
                mergedAt={p.mergedAt}
                onClick={() => soon('Linking an undocumented PR to a requirement is coming soon.')}
              />
            ))}
          </div>
        )}

        {/* Unlinked requirements — no code */}
        {showUnlinked && unlinked.length > 0 && (
          <div style={st({ marginTop: 48 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 })}>
              <Ico n="doc" s={13} c="var(--t3)" />
              <span style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)' })}>
                Requirements with no linked code
              </span>
            </div>
            {unlinked.map(r => (
              <ReqRow
                key={r.id}
                id={r.id}
                title={r.title}
                status="unlinked"
                onClick={() => goToReq(r.id)}
                action={{ label: 'Link PR', icon: 'link' }}
              />
            ))}
          </div>
        )}

        {/* In sync */}
        {showInSync && inSync.length > 0 && (
          <div style={st({ marginTop: 48 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 })}>
              <Ico n="check" s={13} c="var(--ok)" />
              <span style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ok)' })}>
                In sync
              </span>
            </div>
            {inSync.map(r => (
              <ReqRow
                key={r.id}
                id={r.id}
                title={r.title}
                status="in-sync"
                prNum={r.code?.pr}
                prTitle={r.code?.prTitle}
                onClick={() => goToReq(r.id)}
              />
            ))}
          </div>
        )}

        {reqs.length === 0 && (
          <div style={st({ paddingTop: 80, textAlign: 'center' })}>
            <Ico n="shield" s={32} c="var(--bd2)" />
            <div style={st({ fontSize: 14, color: 'var(--t3)', marginTop: 12 })}>No requirements tracked for this project yet.</div>
          </div>
        )}
      </div>

      {notice && (
        <div style={st({ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'var(--sf2)', border: '1px solid var(--bd2)', borderRadius: 10, boxShadow: 'var(--sh2)', maxWidth: 440 })}>
          <Ico n="link" s={14} c="var(--ac)" />
          <span style={st({ fontSize: 13, color: 'var(--t1)', fontWeight: 500 })}>{notice}</span>
        </div>
      )}
    </div>
  )
}
