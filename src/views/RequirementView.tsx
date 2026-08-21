import { useApp } from '../context/AppContext'
import { REQUIREMENTS_DETAIL, TEAM_DATA, PROJECTS, DOCUMENTS } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { st } from '../lib/utils'
import type { GeneratedRequirement } from '../types'

const STATUS_CONFIG = {
  'in-sync':     { label: 'In sync',     color: 'var(--ok)',   bg: 'rgba(78,173,121,0.12)' },
  'stale':       { label: 'Stale',       color: 'var(--warn)', bg: 'rgba(230,163,60,0.12)' },
  'contradicted':{ label: 'Contradicted',color: 'var(--err)',  bg: 'rgba(224,95,106,0.12)' },
  'unlinked':    { label: 'No code yet', color: 'var(--t3)',   bg: 'var(--sf)' },
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'var(--err)' },
  high:     { label: 'High',     color: 'var(--warn)' },
  medium:   { label: 'Medium',   color: 'var(--ac)' },
  low:      { label: 'Low',      color: 'var(--t3)' },
}

const SOURCE_ICONS = {
  slack:   { icon: '💬', label: 'Slack' },
  jira:    { icon: '🔷', label: 'Jira' },
  email:   { icon: '✉️', label: 'Email' },
  meeting: { icon: '🎙', label: 'Meeting' },
}

function ChainStep({ n, label, status, children }: {
  n: number; label: string; status?: string; children: React.ReactNode
}) {
  const cfg = status ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null
  return (
    <div style={st({ display: 'flex', gap: 0, marginBottom: 48 })}>
      {/* Left rail */}
      <div style={st({ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' })}>
        <div className="mono" style={st({
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--sf)', border: '1.5px solid var(--bd2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--t3)', flexShrink: 0,
        })}>
          {n}
        </div>
        <div style={st({ width: 1, flex: 1, background: 'var(--bd)', marginTop: 6 })} />
      </div>

      {/* Content */}
      <div style={st({ flex: 1, paddingLeft: 16, paddingBottom: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 })}>
          <span style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)' })}>
            {label}
          </span>
          {cfg && (
            <span style={st({
              fontSize: 11, fontWeight: 600, color: cfg.color,
              background: cfg.bg, padding: '2px 8px', borderRadius: 100,
            })}>
              {cfg.label}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Live generated requirement (full source-quote trace) ────────────────────
function LiveRequirementPanel({ req, onBack, sourceTitle, brdTitle }: {
  req: GeneratedRequirement
  onBack: () => void
  sourceTitle?: string
  brdTitle?: string
}) {
  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>
      {/* Header bar */}
      <div style={st({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 40px', borderBottom: '1px solid var(--bd)', flexShrink: 0 })}>
        <button onClick={onBack} style={st({ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--t3)', fontFamily: 'inherit', padding: '4px 8px 4px 0' })}>
          <Ico n="arrow-l" s={14} c="currentColor" /> Back
        </button>
        <div style={st({ width: 1, height: 16, background: 'var(--bd)' })} />
        <span className="mono" style={st({ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' })}>{req.id}</span>
        <span style={st({ fontSize: 11, fontWeight: 600, color: 'var(--ok)', background: 'rgba(78,173,121,0.12)', padding: '3px 10px', borderRadius: 100 })}>In sync · traced</span>
        <div style={st({ marginLeft: 'auto', display: 'flex', gap: 8 })}>
          <Btn v="ghost" onClick={onBack}><Ico n="arrow-r" s={13} c="var(--t2)" /> Back to document</Btn>
        </div>
      </div>

      {/* Body */}
      <div style={st({ flex: 1, overflowY: 'auto' })}>
        <div style={st({ padding: '40px 52px 80px', maxWidth: 760 })}>
          <div style={st({ fontSize: 11, color: 'var(--t3)', marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' })}>
            {sourceTitle && <span>{sourceTitle}</span>}
            {brdTitle && <><span style={st({ color: 'var(--bd2)' })}>·</span><span>{brdTitle}</span></>}
          </div>
          <h1 className="bri" style={st({ fontSize: 30, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.045em', lineHeight: 1.2, margin: '0 0 30px' })}>
            {req.text}
          </h1>

          {/* Source chain */}
          <ChainStep n={1} label="Source">
            <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 })}>
              <span style={st({ fontSize: 15 })}>🎙</span>
              <span style={st({ fontSize: 12, color: 'var(--t3)', fontWeight: 600 })}>Meeting / transcript</span>
              <span style={st({ fontSize: 12, color: 'var(--t3)', marginLeft: 'auto' })}>{req.timestamp ? new Date(req.timestamp).toLocaleString() : '—'}</span>
            </div>
            <blockquote style={st({ fontSize: 16, fontStyle: 'italic', color: 'var(--t1)', lineHeight: 1.7, margin: 0, padding: '16px 20px', background: 'var(--sf)', borderRadius: 10, borderLeft: '3px solid var(--bd2)' })}>
              {req.sourceQuote}
            </blockquote>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 })}>
              <div style={st({ width: 18, height: 18, borderRadius: '50%', background: '#9B6FE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' })}>
                {req.author.slice(0, 1).toUpperCase()}
              </div>
              <span style={st({ fontSize: 12, color: 'var(--t3)' })}>Quoted by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{req.author}</strong></span>
            </div>
          </ChainStep>

          {/* Conflicts referencing this requirement */}
          <ChainStep n={2} label="Conflicts" status={req.conflicts.length > 0 ? undefined : 'in-sync'}>
            {req.conflicts.length === 0 ? (
              <div style={st({ fontSize: 13, color: 'var(--t3)' })}>No conflicts reference this requirement.</div>
            ) : (
              <div style={st({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                {req.conflicts.map(c => (
                  <div key={c.id} style={st({ padding: '12px 14px', background: 'rgba(224,95,106,0.07)', border: '1px solid rgba(224,95,106,0.25)', borderRadius: 10, fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6 })}>
                    <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 })}>
                      <Ico n="warning" s={13} c="var(--err)" />
                      <span className="mono" style={st({ fontSize: 10.5, fontWeight: 700, color: 'var(--err)' })}>{c.id}</span>
                      <span style={st({ fontSize: 11, fontWeight: 700, color: c.severity === 'major' ? 'var(--err)' : 'var(--warn)' })}>{c.severity === 'major' ? 'major' : 'minor'}</span>
                    </div>
                    <div>{c.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </ChainStep>

          {/* Next downstream */}
          <div style={st({ display: 'flex', gap: 0 })}>
            <div style={st({ width: 36, flexShrink: 0 })}>
              <div className="mono" style={st({ width: 28, height: 28, borderRadius: '50%', background: 'var(--sf)', border: '1.5px solid var(--bd2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--t3)' })}>3</div>
            </div>
            <div style={st({ flex: 1, paddingLeft: 16 })}>
              <div style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 })}>Downstream</div>
              <button onClick={onBack} style={st({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--ac)', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 })}>
                Back to generated BRD <Ico n="arrow-r" s={11} c="var(--ac)" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RequirementView() {
  const { activeReqId, setView, setActiveReqId, liveBRD, liveSource } = useApp()

  // Live path: render a real generated requirement (full source-quote trace).
  const liveReq = liveBRD?.requirements.find(r => r.id === activeReqId) ?? null
  if (liveReq) {
    return (
      <LiveRequirementPanel
        req={liveReq}
        onBack={() => { setActiveReqId(null); setView('document') }}
        sourceTitle={liveSource?.title}
        brdTitle={liveBRD?.title}
      />
    )
  }

  const req = REQUIREMENTS_DETAIL.find(r => r.id === activeReqId) || REQUIREMENTS_DETAIL[0]
  const doc = DOCUMENTS.find(d => d.id === req.docId)
  const proj = PROJECTS.find(p => p.id === req.pid)
  const statusCfg = STATUS_CONFIG[req.status]
  const priorityCfg = PRIORITY_CONFIG[req.priority]
  const srcCfg = SOURCE_ICONS[req.source.origin.type]
  const sourceAuthor = TEAM_DATA.find(t => t.id === req.source.origin.authorId)
  const figmaApprover = req.figma ? TEAM_DATA.find(t => t.id === req.figma!.approvedById) : null
  const codeAuthor = req.code ? TEAM_DATA.find(t => t.id === req.code!.authorId) : null

  const goBack = () => {
    setActiveReqId(null)
    setView('document')
  }

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' })}>

      {/* Header bar */}
      <div style={st({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 40px', borderBottom: '1px solid var(--bd)',
        flexShrink: 0,
      })}>
        <button
          onClick={goBack}
          style={st({
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--t3)', fontFamily: 'inherit',
            padding: '4px 8px 4px 0', transition: 'color 0.12s',
          })}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
        >
          <Ico n="arrow-l" s={14} c="currentColor" /> Back
        </button>

        <div style={st({ width: 1, height: 16, background: 'var(--bd)' })} />

        <span className="mono" style={st({ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.02em' })}>{req.id}</span>

        <span style={st({
          fontSize: 11.5, fontWeight: 600, color: statusCfg.color,
          background: statusCfg.bg, padding: '3px 10px', borderRadius: 100,
        })}>
          {statusCfg.label}
        </span>

        <span style={st({
          fontSize: 11.5, fontWeight: 600, color: priorityCfg.color,
          background: 'var(--sf)', border: '1px solid var(--bd)', padding: '3px 10px', borderRadius: 100,
        })}>
          {priorityCfg.label}
        </span>

        <div style={st({ marginLeft: 'auto', display: 'flex', gap: 8 })}>
          <Btn v="ghost" onClick={() => setView('traceability')}>
            <Ico n="shield" s={13} c="var(--t2)" /> Traceability board
          </Btn>
          <Btn v="ghost" onClick={() => {}}>
            <Ico n="download" s={13} c="var(--t2)" /> Export
          </Btn>
        </div>
      </div>

      {/* Body */}
      <div style={st({ flex: 1, overflowY: 'auto' })}>
        <div style={st({ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: '100%' })}>

          {/* Main chain */}
          <div style={st({ padding: '44px 52px 80px', borderRight: '1px solid var(--bd)' })}>

            {/* Title block */}
            <div style={st({ marginBottom: 8 })}>
              <div style={st({ fontSize: 11, color: 'var(--t3)', marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' })}>
                <span>{proj?.name}</span>
                <span style={st({ color: 'var(--bd2)' })}>·</span>
                <span>{doc?.title}</span>
              </div>
              <h1 className="bri" style={st({
                fontSize: 34, fontWeight: 800, color: 'var(--t1)',
                letterSpacing: '-0.045em', lineHeight: 1.15,
                margin: 0, maxWidth: 640,
              })}>
                {req.title}
              </h1>
            </div>

            <div style={st({ height: 1, background: 'var(--bd)', margin: '32px 0' })} />

            {/* Chain starts here — no cards, just connected vertical content */}

            {/* 1. Source */}
            <ChainStep n={1} label="Source">
              <div style={st({
                display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14,
              })}>
                <span style={st({ fontSize: 15 })}>{srcCfg.icon}</span>
                <span style={st({ fontSize: 12, color: 'var(--t3)', fontWeight: 600 })}>{srcCfg.label}</span>
                {req.source.origin.channel && (
                  <span className="mono" style={st({ fontSize: 12, color: 'var(--t3)' })}>{req.source.origin.channel}</span>
                )}
                <span style={st({ fontSize: 12, color: 'var(--t3)', marginLeft: 'auto' })}>{req.source.origin.date}</span>
              </div>
              <blockquote style={st({
                fontSize: 16, fontStyle: 'italic', color: 'var(--t1)',
                lineHeight: 1.7, margin: 0,
                padding: '16px 20px', background: 'var(--sf)',
                borderRadius: 10, borderLeft: '3px solid var(--bd2)',
              })}>
                {req.source.quote}
              </blockquote>
              {sourceAuthor && (
                <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 })}>
                  <div style={st({ width: 18, height: 18, borderRadius: '50%', background: sourceAuthor.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' })}>
                    {sourceAuthor.initials}
                  </div>
                  <span style={st({ fontSize: 12, color: 'var(--t3)' })}>Quoted by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{sourceAuthor.name}</strong></span>
                </div>
              )}
            </ChainStep>

            {/* 2. Design link */}
            <ChainStep n={2} label="Design" status={req.figma?.status || 'unlinked'}>
              {req.figma ? (
                <div>
                  {/* Figma frame mock — placeholder thumbnail */}
                  <div style={st({
                    height: 120, borderRadius: 10,
                    background: 'linear-gradient(135deg, #F24E1E22, #A259FF22)',
                    border: '1px solid var(--bd2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  })}>
                    <div style={st({ textAlign: 'center' })}>
                      <Ico n="figma" s={28} c="var(--t3)" />
                      <div style={st({ fontSize: 11, color: 'var(--t3)', marginTop: 6 })}>{req.figma.frame}</div>
                    </div>
                  </div>
                  <div style={st({ display: 'flex', alignItems: 'center', gap: 16 })}>
                    <div>
                      <div style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' })}>{req.figma.frame}</div>
                      <div style={st({ fontSize: 12, color: 'var(--t3)', marginTop: 2 })}>
                        {req.figma.version} · Approved {req.figma.approvedAt}
                        {figmaApprover && <> by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{figmaApprover.name}</strong></>}
                      </div>
                    </div>
                    <button style={st({ marginLeft: 'auto', background: 'none', border: '1px solid var(--bd)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 })}>
                      <Ico n="figma" s={12} c="var(--t2)" /> Open in Figma
                    </button>
                  </div>
                </div>
              ) : (
                <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
                  <span style={st({ fontSize: 13, color: 'var(--t3)' })}>No Figma frame linked.</span>
                  <button style={st({ background: 'none', border: '1px solid var(--bd)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 })}>
                    <Ico n="link" s={12} c="var(--t2)" /> Link frame
                  </button>
                </div>
              )}
            </ChainStep>

            {/* 3. Code */}
            <ChainStep n={3} label="Code" status={req.code?.status || 'unlinked'}>
              {req.code ? (
                <div>
                  <div style={st({
                    padding: '14px 16px', background: 'var(--sf)',
                    border: '1px solid var(--bd)', borderRadius: 10,
                    marginBottom: req.code.contradiction ? 12 : 0,
                  })}>
                    <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 10 })}>
                      <Ico n="github" s={15} c="var(--t3)" />
                      <div style={st({ flex: 1 })}>
                        <div style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4 })}>
                          PR #{req.code.pr} — {req.code.prTitle}
                        </div>
                        <div style={st({ fontSize: 12, color: 'var(--t3)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' })}>
                          <span style={st({
                            fontSize: 11, fontWeight: 600,
                            color: req.code.merged ? 'var(--ok)' : 'var(--warn)',
                            background: req.code.merged ? 'rgba(78,173,121,0.12)' : 'rgba(230,163,60,0.12)',
                            padding: '1px 7px', borderRadius: 100,
                          })}>
                            {req.code.merged ? '✓ Merged' : '⏳ Open'}
                          </span>
                          {codeAuthor && <span>by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{codeAuthor.name}</strong></span>}
                          <span>{req.code.mergedAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {req.code.contradiction && (
                    <div style={st({
                      padding: '12px 16px', background: 'rgba(224,95,106,0.07)',
                      border: '1px solid rgba(224,95,106,0.25)', borderRadius: 10,
                      display: 'flex', gap: 10,
                    })}>
                      <Ico n="warning" s={14} c="var(--err)" />
                      <div>
                        <div style={st({ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 4 })}>Contradiction detected</div>
                        <div style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.65 })}>{req.code.contradiction}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
                  <span style={st({ fontSize: 13, color: 'var(--t3)' })}>No PR or commit linked yet.</span>
                  <button style={st({ background: 'none', border: '1px solid var(--bd)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 })}>
                    <Ico n="github" s={12} c="var(--t2)" /> Link PR
                  </button>
                </div>
              )}
            </ChainStep>

            {/* 4. History — final, no bottom line needed */}
            <div style={st({ display: 'flex', gap: 0 })}>
              <div style={st({ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' })}>
                <div className="mono" style={st({
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--sf)', border: '1.5px solid var(--bd2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--t3)', flexShrink: 0,
                })}>
                  4
                </div>
              </div>
              <div style={st({ flex: 1, paddingLeft: 16 })}>
                <div style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 })}>
                  History
                </div>
                {req.history.map((h, i) => {
                  const member = TEAM_DATA.find(t => t.id === h.byId)
                  return (
                    <div key={i} style={st({ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' })}>
                      <span className="mono" style={st({ fontSize: 11, color: 'var(--t3)', fontWeight: 700, flexShrink: 0, paddingTop: 2 })}>v{h.v}</span>
                      <span style={st({ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, flex: 1 })}>{h.change}</span>
                      <div style={st({ fontSize: 11, color: 'var(--t3)', flexShrink: 0, textAlign: 'right' })}>
                        <div>{member?.name}</div>
                        <div>{h.at}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={st({ padding: '44px 28px 80px', background: 'var(--sf)' })}>

            {/* Decision */}
            <div style={st({ marginBottom: 40 })}>
              <div style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12 })}>
                Decision
              </div>
              <p style={st({ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, margin: 0 })}>
                {req.decision}
              </p>
            </div>

            {/* Quick actions */}
            <div style={st({ marginBottom: 40 })}>
              <div style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12 })}>
                Actions
              </div>
              <div style={st({ display: 'flex', flexDirection: 'column', gap: 6 })}>
                {!req.figma && (
                  <button style={st({ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid var(--bd)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'background 0.12s' })}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ac)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                  >
                    <Ico n="figma" s={13} c="var(--t2)" /> Link Figma frame
                  </button>
                )}
                {!req.code && (
                  <button style={st({ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid var(--bd)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'background 0.12s' })}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ac)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                  >
                    <Ico n="github" s={13} c="var(--t2)" /> Link GitHub PR
                  </button>
                )}
                <button style={st({ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid var(--bd)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'background 0.12s' })}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bd)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <Ico n="download" s={13} c="var(--t2)" /> Export to spec format
                </button>
                <button style={st({ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid var(--bd)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'background 0.12s' })}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bd)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <Ico n="comment" s={13} c="var(--t2)" /> Leave a comment
                </button>
              </div>
            </div>

            {/* Chain status summary */}
            <div>
              <div style={st({ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12 })}>
                Chain status
              </div>
              {[
                { label: 'Source', status: 'in-sync' as const },
                { label: 'Design', status: (req.figma?.status || 'unlinked') as 'in-sync' | 'stale' | 'contradicted' | 'unlinked' },
                { label: 'Code', status: (req.code?.status || 'unlinked') as 'in-sync' | 'stale' | 'contradicted' | 'unlinked' },
              ].map(({ label, status }) => {
                const cfg = STATUS_CONFIG[status]
                return (
                  <div key={label} style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--bd)' })}>
                    <span style={st({ fontSize: 12.5, color: 'var(--t2)' })}>{label}</span>
                    <span style={st({ fontSize: 11, fontWeight: 600, color: cfg.color })}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
