import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { DOCUMENTS, DOC_META, BRD_SECTIONS, AI_FLAGS, TEAM, COLLAB_COMMENTS, CONFLICTS_DATA, REQUIREMENTS_DETAIL, PROJECTS } from '../data'
import { Ico } from '../components/ui/Icon'
import { Avatar, AvatarRow } from '../components/ui/Avatar'
import { Btn } from '../components/ui/Button'
import { DocTag } from '../components/ui/DocTag'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'
import { computeCompleteness } from '../server/generator'
import { resolveConflict as persistBRDConflict } from '../lib/api'
import type { DocMode, AiFlag, BRD, GeneratedRequirement, SourceConflict } from '../types'

// ─── AI Flag inline card ──────────────────────────────────────────────────────
function AiFlagCard({ flag, onResolve }: { flag: AiFlag; onResolve: (id: string, option: string) => void }) {
  const [custom, setCustom] = useState('')
  if (flag.resolved) {
    return (
      <div style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: '1px solid var(--bd)', marginTop: 10 })}>
        <Ico n="check" s={11} c="var(--ok)" />
        <span style={st({ fontSize: 12, color: 'var(--ok)', fontWeight: 600 })}>Resolved: {flag.resolvedOption}</span>
        <span style={st({ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' })}>by {flag.resolvedBy}</span>
      </div>
    )
  }
  return (
    <div style={st({ padding: '12px 0 12px 16px', borderTop: '1px solid var(--bd)', borderLeft: '2px solid var(--ai)', marginTop: 12 })}>
      <div style={st({ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' })}>
        <Trace size={18} mood="thinking" />
        <p style={st({ fontSize: 12.5, color: 'var(--t2)', margin: 0, lineHeight: 1.6 })}>{flag.label}</p>
      </div>
      <div style={st({ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 })}>
        {flag.options.map(opt => (
          <button key={opt} onClick={() => onResolve(flag.id, opt)}
            style={st({ padding: '4px 11px', borderRadius: 100, background: 'transparent', border: '1px solid var(--bd2)', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 })}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ai)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ai)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd2)' }}>
            {opt}
          </button>
        ))}
      </div>
      <div style={st({ display: 'flex', gap: 6 })}>
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Write your own…"
          style={st({ flex: 1, background: 'transparent', border: '1px solid var(--bd)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit' })} />
        {custom.trim() && <Btn sm onClick={() => { onResolve(flag.id, custom); setCustom('') }}>Add</Btn>}
      </div>
    </div>
  )
}

// ─── Brief mode ───────────────────────────────────────────────────────────────
function BriefMode({ doc, m }: { doc: typeof DOCUMENTS[0]; m: typeof DOC_META[keyof typeof DOC_META] }) {
  const { setView, setActiveReqId, activeProjectId } = useApp()
  const proj = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]

  const goToReq = (reqId: string) => {
    if (REQUIREMENTS_DETAIL.some(r => r.id === reqId)) { setActiveReqId(reqId); setView('requirement') }
  }

  const stats = [
    { n: '39', label: 'requirements', color: m.color },
    { n: '4',  label: 'conflicts',    color: 'var(--err)' },
    { n: '5',  label: 'stakeholders', color: 'var(--t1)' },
    { n: '3',  label: 'sources',      color: 'var(--t1)' },
  ]

  return (
    <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

      {/* Document header */}
      <div style={st({ padding: '36px 52px 28px', borderBottom: '1px solid var(--bd)' })}>
        <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 40 })}>
          <div style={st({ flex: 1, minWidth: 0 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 })}>
              <DocTag type={doc.type} />
              <span style={st({ fontSize: 12, color: 'var(--t3)' })}>{proj.name}</span>
              {doc.ai && <span style={st({ fontSize: 9, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.07em' })}>AI</span>}
            </div>
            <h1 className="bri" style={st({ fontSize: 30, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.045em', lineHeight: 1.15, margin: '0 0 14px', maxWidth: 560 })}>
              {doc.title}
            </h1>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8 })}>
              <Avatar uid={doc.author} size={20} />
              <span style={st({ fontSize: 12, color: 'var(--t2)' })}>{TEAM.find(t => t.id === doc.author)?.name}</span>
              {doc.contrib.length > 0 && <><AvatarRow uids={doc.contrib} size={18} /><span style={st({ fontSize: 11, color: 'var(--t3)' })}>+{doc.contrib.length}</span></>}
              <span style={st({ color: 'var(--bd2)' })}>·</span>
              <span style={st({ fontSize: 11, color: 'var(--t3)' })}>v{doc.v} · {doc.when} · {doc.status}</span>
            </div>
          </div>
          {/* Compact inline stats */}
          <div style={st({ display: 'flex', gap: 28, flexShrink: 0, paddingTop: 8 })}>
            {stats.map((s, i) => (
              <div key={i} style={st({ textAlign: 'right' })}>
                <div className="bri" style={st({ fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', color: s.color, lineHeight: 1 })}>{s.n}</div>
                <div style={st({ fontSize: 10, color: 'var(--t3)', marginTop: 2 })}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={st({ display: 'grid', gridTemplateColumns: '1fr 280px' })}>

        {/* Left: main */}
        <div style={st({ padding: '32px 52px 60px', borderRight: '1px solid var(--bd)' })}>

          {/* Trace read */}
          <div style={st({ marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid var(--bd)' })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 })}>
              <Trace size={16} mood="thinking" />
              <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Trace's read</span>
            </div>
            <p style={st({ fontSize: 17, color: 'var(--t1)', lineHeight: 1.75, margin: 0, fontStyle: 'italic', fontWeight: 400 })}>
              A BRD for overhauling checkout — targeting{' '}
              <strong style={st({ fontStyle: 'normal', fontWeight: 700, color: m.color })}>30% fewer abandoned carts</strong>{' '}
              and <strong style={st({ fontStyle: 'normal', fontWeight: 700, color: m.color })}>18% higher order values</strong>.{' '}
              <span style={st({ color: 'var(--t2)', fontStyle: 'normal', fontSize: 14 })}>
                Built from 4 Slack threads, 22 Jira items, 11 commits. 39 requirements extracted.
              </span>
            </p>
          </div>

          {/* Conflicts */}
          {doc.conflicts > 0 && (
            <div style={st({ marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid var(--bd)', paddingLeft: 16, borderLeft: '2px solid var(--err)' })}>
              <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--err)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Needs attention before shipping</div>
              <div style={st({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                {CONFLICTS_DATA.slice(0, 3).map(c => (
                  <div key={c.id} style={st({ display: 'flex', alignItems: 'baseline', gap: 10 })}>
                    <span className="mono" style={st({ fontSize: 10, color: c.severity === 'major' ? 'var(--err)' : 'var(--t3)', fontWeight: 700, flexShrink: 0 })}>{c.id}</span>
                    <span style={st({ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 })}>{c.title}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setView('conflicts')}
                style={st({ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--err)', fontWeight: 600, fontFamily: 'inherit', padding: 0 })}>
                Resolve all {doc.conflicts} conflicts →
              </button>
            </div>
          )}

          {/* Source chain — flat text */}
          <div style={st({ marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid var(--bd)' })}>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 })}>Built from</div>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' })}>
              {[
                { icon: 'slack' as const, label: '#product-checkout', n: '14 msgs', color: '#E01E5A' },
                { icon: 'jira' as const, label: 'SHOP-124', n: '22 items', color: '#4d9fff' },
                { icon: 'github' as const, label: 'checkout-v2', n: '11 commits', color: 'var(--t2)' },
              ].map((src, i) => (
                <span key={src.label} style={st({ display: 'flex', alignItems: 'center', gap: 5 })}>
                  <Ico n={src.icon} s={13} c={src.color} />
                  <span style={st({ fontSize: 12.5, color: 'var(--t1)', fontWeight: 500 })}>{src.label}</span>
                  <span className="mono" style={st({ fontSize: 10.5, color: 'var(--t3)' })}>{src.n}</span>
                  {i < 2 && <span style={st({ color: 'var(--bd2)', margin: '0 4px' })}>→</span>}
                </span>
              ))}
              <span style={st({ color: 'var(--bd2)', margin: '0 4px' })}>→</span>
              <span style={st({ fontSize: 12.5, color: m.color, fontWeight: 600 })}>this BRD</span>
            </div>
          </div>

          {/* Top requirements */}
          <div>
            <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 })}>
              <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Top requirements</span>
              <button onClick={() => {}} style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ac)', fontWeight: 600, fontFamily: 'inherit', padding: 0 })}>
                Full read →
              </button>
            </div>
            {BRD_SECTIONS[1].items!.slice(0, 5).map((req, i) => {
              const [code, ...rest] = req.split('—')
              const reqId = code.trim()
              const hasDetail = REQUIREMENTS_DETAIL.some(r => r.id === reqId)
              return (
                <div key={i} style={st({ display: 'flex', gap: 14, alignItems: 'baseline', padding: '11px 0', borderBottom: i < 4 ? '1px solid var(--bd)' : 'none' })}>
                  <button onClick={() => goToReq(reqId)} className="mono"
                    style={st({ background: 'none', border: 'none', padding: 0, cursor: hasDetail ? 'pointer' : 'default', fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: m.color, fontWeight: 700, flexShrink: 0, textDecoration: hasDetail ? 'underline' : 'none', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' })}>
                    {reqId}
                  </button>
                  <span style={st({ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.6 })}>{rest.join('—').trim()}</span>
                  {hasDetail && (
                    <button onClick={() => goToReq(reqId)}
                      style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 })}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ac)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}>
                      chain <Ico n="arrow-r" s={10} c="currentColor" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: context */}
        <div style={st({ padding: '32px 28px 60px' })}>
          {AI_FLAGS.filter(f => !f.resolved).length > 0 && (
            <div style={st({ marginBottom: 36 })}>
              <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ai)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 })}>
                <span style={st({ width: 5, height: 5, borderRadius: '50%', background: 'var(--ai)', display: 'inline-block' })} />
                Trace is waiting on you
              </div>
              {AI_FLAGS.filter(f => !f.resolved).slice(0, 2).map((f, i) => (
                <div key={f.id} style={st({ padding: '10px 0', borderBottom: i < 1 ? '1px solid var(--bd)' : 'none' })}>
                  <p style={st({ fontSize: 12.5, color: 'var(--t2)', margin: '0 0 6px', lineHeight: 1.55 })}>{f.label}</p>
                  <div style={st({ display: 'flex', gap: 5 })}>
                    {f.options.slice(0, 2).map(opt => (
                      <button key={opt} style={st({ fontSize: 11, color: 'var(--ai)', background: 'var(--aid)', border: 'none', borderRadius: 100, padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit' })}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={st({ marginBottom: 36 })}>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 })}>The team</div>
            <div style={st({ display: 'flex', flexDirection: 'column', gap: 10 })}>
              {['u1', 'u2', 'u4'].map(uid => {
                const u = TEAM.find(t => t.id === uid)!
                return (
                  <div key={uid} style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
                    <Avatar uid={uid} size={24} />
                    <div style={st({ flex: 1, minWidth: 0 })}>
                      <div style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)' })}>{u.name}</div>
                      <div style={st({ fontSize: 11, color: 'var(--t3)', textTransform: 'capitalize' })}>{u.role}</div>
                    </div>
                    {u.online && <div style={st({ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0 })} />}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Quick actions</div>
            <div style={st({ display: 'flex', flexDirection: 'column', gap: 5 })}>
              <Btn v="ghost" sm onClick={() => setView('conflicts')}><Ico n="warning" s={12} c="var(--err)" /> View 4 conflicts</Btn>
              <Btn v="ghost" sm onClick={() => setView('traceability')}><Ico n="link" s={12} c="var(--t2)" /> Code traceability</Btn>
              <Btn v="ghost" sm><Ico n="download" s={12} c="var(--t2)" /> Export document</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Read mode ────────────────────────────────────────────────────────────────
function ReadMode({ doc, m }: { doc: typeof DOCUMENTS[0]; m: typeof DOC_META[keyof typeof DOC_META] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ s1: true })
  const [flags, setFlags] = useState(AI_FLAGS)
  const [traceOpen, setTraceOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [sectionTexts, setSectionTexts] = useState<Record<string, string>>({})
  const { setView, setActiveReqId } = useApp()

  const resolveFlag = (id: string, option: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, resolved: true, resolvedOption: option, resolvedBy: 'Katrina M.' } : f))
  }
  const goToReq = (reqId: string) => {
    if (REQUIREMENTS_DETAIL.some(r => r.id === reqId)) { setActiveReqId(reqId); setView('requirement') }
  }
  const pendingFlags = flags.filter(f => !f.resolved)

  return (
    <div style={st({ flex: 1, display: 'flex', overflow: 'hidden' })}>
      <div style={st({ flex: 1, overflowY: 'auto', padding: '44px 64px 80px', background: 'var(--bg)' })}>
        <div style={st({ maxWidth: 700 })}>
          <h1 className="bri" style={st({ fontSize: 28, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.045em', lineHeight: 1.15, margin: '0 0 14px' })}>{doc.title}</h1>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--bd)' })}>
            <Avatar uid={doc.author} size={20} />
            <span style={st({ fontSize: 12, color: 'var(--t2)' })}>{TEAM.find(t => t.id === doc.author)?.name}</span>
            {doc.contrib.length > 0 && <><span style={st({ color: 'var(--bd2)' })}>+</span><AvatarRow uids={doc.contrib} size={18} /></>}
            <span style={st({ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' })}>v{doc.v} · {doc.when}</span>
            {pendingFlags.length > 0 && (
              <div style={st({ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ai)', fontWeight: 600 })}>
                <Ico n="sparkle" s={11} c="var(--ai)" />{pendingFlags.length} pending
              </div>
            )}
            <button onClick={() => setTraceOpen(o => !o)}
              style={st({ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', borderBottom: `1.5px solid ${traceOpen ? 'var(--ai)' : 'transparent'}`, padding: '0 0 2px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: traceOpen ? 'var(--ai)' : 'var(--t2)', fontWeight: 500 })}>
              <Ico n="link" s={11} c={traceOpen ? 'var(--ai)' : 'var(--t3)'} /> Sources
            </button>
          </div>

          {BRD_SECTIONS.map(sec => {
            const isOpen = open[sec.id] ?? false
            const sectionFlags = flags.filter(f => f.sectionId === sec.id)
            const hasPending = sectionFlags.some(f => !f.resolved)
            const isEditing = editingSection === sec.id
            return (
              <div key={sec.id} style={st({ marginBottom: 4 })}>
                <button onClick={() => { setOpen(p => ({ ...p, [sec.id]: !p[sec.id] })); setEditingSection(null) }}
                  style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', background: 'none', border: 'none', borderBottom: isOpen ? 'none' : '1px solid var(--bd)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' })}>
                  <span className="mono" style={st({ fontSize: 10, color: isOpen ? m.color : 'var(--t3)', fontWeight: 700, width: 20, flexShrink: 0 })}>{sec.n}</span>
                  <span className="bri" style={st({ fontSize: 15, fontWeight: 700, color: 'var(--t1)', flex: 1, letterSpacing: '-0.02em' })}>{sec.title}</span>
                  {hasPending && <span style={st({ fontSize: 9.5, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '2px 7px', borderRadius: 100 })}>Trace</span>}
                  <Ico n={isOpen ? 'chevron-d' : 'chevron-r'} s={11} c="var(--t3)" />
                </button>
                {isOpen && (
                  <div style={st({ padding: '16px 0 20px 30px', borderBottom: '1px solid var(--bd)', borderLeft: `2px solid ${m.color}`, marginLeft: 8, paddingLeft: 22 })}>
                    {'body' in sec && sec.body && (
                      isEditing ? (
                        <div>
                          <textarea defaultValue={sectionTexts[sec.id] ?? sec.body}
                            onChange={e => setSectionTexts(t => ({ ...t, [sec.id]: e.target.value }))}
                            style={st({ width: '100%', minHeight: 100, background: 'var(--bg)', border: '1px solid var(--bd2)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.8 })} autoFocus />
                          <div style={st({ display: 'flex', gap: 6, marginTop: 8 })}>
                            <Btn sm v="primary" onClick={() => setEditingSection(null)}>Save</Btn>
                            <Btn sm v="ghost" onClick={() => setEditingSection(null)}>Cancel</Btn>
                          </div>
                        </div>
                      ) : (
                        <div style={st({ position: 'relative' })}>
                          <p style={st({ fontSize: 14, color: 'var(--t2)', lineHeight: 1.8, margin: 0 })}>{sectionTexts[sec.id] ?? sec.body}</p>
                          <button onClick={() => setEditingSection(sec.id)}
                            style={st({ position: 'absolute', top: 0, right: 0, background: 'none', border: '1px solid var(--bd)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontSize: 10.5, color: 'var(--t3)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3, opacity: 0 })}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                            onFocus={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0' }}>
                            <Ico n="edit" s={10} c="var(--t3)" /> Edit
                          </button>
                        </div>
                      )
                    )}
                    {'items' in sec && sec.items && (
                      <div>
                        {sec.items.map((item, j) => {
                          const reqId = item.split('—')[0].trim()
                          const hasDetail = REQUIREMENTS_DETAIL.some(r => r.id === reqId)
                          return (
                            <div key={j} style={st({ display: 'flex', gap: 12, padding: '9px 0', borderBottom: j < sec.items!.length - 1 ? '1px solid var(--bd)' : 'none', alignItems: 'flex-start' })}>
                              <button onClick={() => goToReq(reqId)} className="mono"
                                style={st({ background: 'none', border: 'none', padding: '2px 0 0', cursor: hasDetail ? 'pointer' : 'default', fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: m.color, fontWeight: 700, flexShrink: 0, textDecoration: hasDetail ? 'underline' : 'none', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' })}>
                                {reqId}
                              </button>
                              <div style={st({ flex: 1 })}>
                                <span style={st({ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.7 })}>{item.split('—')[1]?.trim()}</span>
                                {hasDetail && (
                                  <button onClick={() => goToReq(reqId)}
                                    style={st({ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit', padding: 0 })}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ac)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}>
                                    chain <Ico n="arrow-r" s={10} c="currentColor" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {sectionFlags.map(f => <AiFlagCard key={f.id} flag={f} onResolve={resolveFlag} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {traceOpen && (
        <div style={st({ width: 240, flexShrink: 0, borderLeft: '1px solid var(--bd)', overflowY: 'auto', padding: '28px 20px', background: 'var(--bg)' })}>
          <div style={st({ marginBottom: 28 })}>
            <div style={st({ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 })}>Built from</div>
            {[
              { icon: 'slack' as const, name: 'Slack', resource: '#product-checkout', items: 14, color: '#E01E5A' },
              { icon: 'jira' as const, name: 'Jira', resource: 'SHOP-124', items: 22, color: '#4d9fff' },
              { icon: 'github' as const, name: 'GitHub', resource: 'checkout-v2', items: 11, color: 'var(--t2)' },
            ].map((src, i) => (
              <div key={src.name} style={st({ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--bd)' : 'none', alignItems: 'flex-start' })}>
                <Ico n={src.icon} s={13} c={src.color} />
                <div>
                  <div style={st({ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 1 })}>{src.name}</div>
                  <div style={st({ fontSize: 11, color: 'var(--t3)' })}>{src.resource}</div>
                  <div className="mono" style={st({ fontSize: 10.5, color: 'var(--t2)', marginTop: 1 })}>{src.items} items</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={st({ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 })}>Open decisions</div>
            {flags.map((f, i) => (
              <div key={f.id} style={st({ padding: '9px 0', borderBottom: i < flags.length - 1 ? '1px solid var(--bd)' : 'none' })}>
                <div style={st({ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 })}>
                  <div style={st({ width: 4, height: 4, borderRadius: '50%', background: f.resolved ? 'var(--ok)' : 'var(--ai)', flexShrink: 0 })} />
                  <span style={st({ fontSize: 10, color: f.resolved ? 'var(--ok)' : 'var(--ai)', fontWeight: 700 })}>{f.resolved ? 'Resolved' : 'Pending'}</span>
                </div>
                <p style={st({ fontSize: 12, color: 'var(--t2)', margin: 0, lineHeight: 1.55 })}>{f.label}</p>
                {f.resolvedOption && <div style={st({ fontSize: 11, color: 'var(--ok)', marginTop: 2, fontWeight: 500 })}>→ {f.resolvedOption}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Comment thread component ─────────────────────────────────────────────────
type Comment = { id: string; uid: string; req: string; text: string; time: string; resolved: boolean; replies?: { uid: string; text: string; time: string }[] }

function CommentThread({
  comments, resolved, onResolve, sectionColor, sectionLabel,
  draft, onDraftChange, onSubmit,
}: {
  comments: Comment[]
  resolved: Set<string>
  onResolve: (id: string) => void
  sectionColor: string
  sectionLabel: string
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: () => void
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [localReplies, setLocalReplies] = useState<Record<string, { uid: string; text: string; time: string }[]>>({})

  const submitReply = (cmId: string) => {
    if (!replyDraft.trim()) return
    setLocalReplies(r => ({ ...r, [cmId]: [...(r[cmId] || []), { uid: 'u1', text: replyDraft, time: 'just now' }] }))
    setReplyDraft('')
    setReplyTo(null)
  }

  return (
    <div>
      {/* Section label */}
      <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 })}>
        <span style={st({ width: 4, height: 4, borderRadius: '50%', background: sectionColor, flexShrink: 0, display: 'inline-block' })} />
        <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' })}>{sectionLabel}</span>
      </div>

      {/* Existing comments */}
      {comments.length === 0 && (
        <p style={st({ fontSize: 12.5, color: 'var(--t3)', margin: '0 0 16px', fontStyle: 'italic' })}>No comments yet on this section.</p>
      )}
      {comments.map((cm, i) => {
        const u = TEAM.find(t => t.id === cm.uid)!
        const isDone = resolved.has(cm.id) || cm.resolved
        const replies = localReplies[cm.id] || []
        return (
          <div key={cm.id} style={st({ marginBottom: 16, opacity: isDone ? 0.45 : 1, transition: 'opacity 0.2s' })}>
            <div style={st({ display: 'flex', gap: 9, alignItems: 'flex-start' })}>
              <Avatar uid={cm.uid} size={22} />
              <div style={st({ flex: 1, minWidth: 0 })}>
                <div style={st({ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 })}>
                  <span style={st({ fontSize: 12, fontWeight: 600, color: 'var(--t1)' })}>{u.name.split(' ')[0]}</span>
                  <span className="mono" style={st({ fontSize: 9.5, color: sectionColor, background: `${sectionColor}14`, padding: '1px 5px', borderRadius: 3 })}>{cm.req}</span>
                  {isDone && <Ico n="check" s={10} c="var(--ok)" />}
                  <span style={st({ fontSize: 10.5, color: 'var(--t3)', marginLeft: 'auto' })}>{cm.time}</span>
                </div>
                <p style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, margin: '0 0 6px' })}>{cm.text}</p>
                {!isDone && (
                  <div style={st({ display: 'flex', gap: 10, alignItems: 'center' })}>
                    <button onClick={() => { setReplyTo(replyTo === cm.id ? null : cm.id); setReplyDraft('') }}
                      style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 3 })}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}>
                      ↩ Reply
                    </button>
                    <button onClick={() => onResolve(cm.id)}
                      style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ok)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 3 })}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}>
                      <Ico n="check" s={10} c="var(--ok)" /> Resolve
                    </button>
                  </div>
                )}
                {/* Replies */}
                {replies.length > 0 && (
                  <div style={st({ marginTop: 10, paddingLeft: 12, borderLeft: '1px solid var(--bd)' })}>
                    {replies.map((r, j) => {
                      const ru = TEAM.find(t => t.id === r.uid)!
                      return (
                        <div key={j} style={st({ display: 'flex', gap: 7, marginBottom: 8 })}>
                          <Avatar uid={r.uid} size={18} />
                          <div>
                            <span style={st({ fontSize: 11.5, fontWeight: 600, color: 'var(--t1)', marginRight: 5 })}>{ru.name.split(' ')[0]}</span>
                            <span style={st({ fontSize: 11.5, color: 'var(--t2)' })}>{r.text}</span>
                            <span style={st({ fontSize: 10, color: 'var(--t3)', marginLeft: 6 })}>{r.time}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Reply composer */}
                {replyTo === cm.id && (
                  <div style={st({ marginTop: 8, display: 'flex', gap: 7, paddingLeft: 2 })}>
                    <Avatar uid="u1" size={18} />
                    <input value={replyDraft} onChange={e => setReplyDraft(e.target.value)}
                      placeholder="Reply…"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') submitReply(cm.id); if (e.key === 'Escape') setReplyTo(null) }}
                      style={st({ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--bd2)', padding: '3px 0', fontSize: 12, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit' })} />
                    {replyDraft.trim() && (
                      <button onClick={() => submitReply(cm.id)}
                        style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ac)', fontFamily: 'inherit', fontWeight: 600, padding: 0 })}>
                        Send
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {i < comments.length - 1 && <div style={st({ height: 1, background: 'var(--bd)', margin: '12px 0 0' })} />}
          </div>
        )
      })}

      {/* New comment composer */}
      <div style={st({ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--bd)' })}>
        <div style={st({ display: 'flex', gap: 8, alignItems: 'flex-start' })}>
          <Avatar uid="u1" size={22} />
          <div style={st({ flex: 1 })}>
            <textarea value={draft} onChange={e => onDraftChange(e.target.value)}
              placeholder="Add a comment on this section…"
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); onSubmit() } }}
              style={st({ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--bd)', padding: '4px 0', fontSize: 12.5, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6 })} />
            {draft.trim() && (
              <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 })}>
                <span style={st({ fontSize: 10.5, color: 'var(--t3)' })}>⌘ Enter to send</span>
                <button onClick={onSubmit}
                  style={st({ background: 'var(--ac)', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0F0F0E', fontFamily: 'inherit' })}>
                  Comment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Collaborate / Review mode ────────────────────────────────────────────────
function ActMode({ doc, m }: { doc: typeof DOCUMENTS[0]; m: typeof DOC_META[keyof typeof DOC_META] }) {
  const { setView } = useApp()
  const present = TEAM.filter(t => ['u2', 'u4'].includes(t.id))
  const [allComments, setAllComments] = useState<Comment[]>(COLLAB_COMMENTS.map(c => ({ ...c, replies: [] })))
  const [selectedSection, setSelectedSection] = useState<string | null>('s2')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState(new Set<string>())
  const [rightTab, setRightTab] = useState<'threads' | 'review' | 'chain'>('threads')
  const [reviewStatus, setReviewStatus] = useState<Record<string, 'approved' | 'changes' | null>>({
    s1: 'approved', s2: null, s3: null, s4: 'changes', s5: null,
  })
  const [jamesTyping, setJamesTyping] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setJamesTyping(true), 3000)
    const t2 = setTimeout(() => setJamesTyping(false), 7000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [])

  const sectionPresence: Record<string, { name: string; color: string; typing?: boolean }> = {
    s2: { name: 'James', color: '#5B8DEF', typing: true },
    s4: { name: 'Omar', color: '#9B6FE8', typing: false },
  }

  const commentsForSection = (sectionId: string) =>
    allComments.filter(c => {
      if (sectionId === 's2') return ['REQ-003', 'REQ-007'].includes(c.req)
      if (sectionId === 's3') return c.req === 'REQ-011'
      return false
    })

  const activeComments = selectedSection ? commentsForSection(selectedSection) : []

  const submitComment = (sectionId: string) => {
    const text = drafts[sectionId]?.trim()
    if (!text) return
    const reqMap: Record<string, string> = { s2: 'REQ-003', s3: 'REQ-011', s4: 'REQ-007', s5: 'REQ-010' }
    setAllComments(p => [...p, { id: `cm${p.length + 1}`, uid: 'u1', req: reqMap[sectionId] || 'REQ-001', text, time: 'just now', resolved: false, replies: [] }])
    setDrafts(d => ({ ...d, [sectionId]: '' }))
  }

  const resolve = (id: string) => setResolved(p => new Set([...p, id]))

  const totalOpenComments = allComments.filter(c => !resolved.has(c.id) && !c.resolved).length

  return (
    <div style={st({ flex: 1, display: 'flex', overflow: 'hidden' })}>

      {/* Left: Document with inline presence */}
      <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>

        {/* Presence bar */}
        <div style={st({ padding: '10px 36px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 })}>
          <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
            <div style={st({ display: 'flex', gap: 0 })}>
              {present.map((u, i) => (
                <div key={u.id} style={st({ marginLeft: i > 0 ? -5 : 0, position: 'relative', zIndex: present.length - i })}>
                  <Avatar uid={u.id} size={24} />
                  <div style={st({ position: 'absolute', bottom: 0, right: 0, width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', border: '1.5px solid var(--bg)' })} />
                </div>
              ))}
            </div>
            <span style={st({ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' })}>
              {present.map(u => u.name.split(' ')[0]).join(' & ')} are reviewing
            </span>
            <span style={st({ fontSize: 11.5, color: 'var(--t3)' })}>
              {jamesTyping ? '· James is typing…' : '· last edit 6 min ago'}
            </span>
          </div>
          <div style={st({ display: 'flex', gap: 6 })}>
            <Btn v="ghost" sm><Ico n="copy" s={12} c="var(--t2)" /> Share</Btn>
            <Btn v="ghost" sm onClick={() => setView('conflicts')}><Ico n="warning" s={12} c="var(--err)" /> 4 conflicts</Btn>
          </div>
        </div>

        {/* Document body */}
        <div style={st({ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' })}>

          {/* Trace alert */}
          <div style={st({ display: 'flex', gap: 12, padding: '13px 16px', borderLeft: '2px solid var(--ai)', marginBottom: 28 })}>
            <Trace size={28} mood="thinking" />
            <div style={st({ flex: 1 })}>
              <p style={st({ fontSize: 13, fontWeight: 700, color: 'var(--ai)', margin: '0 0 3px' })}>2 requirements need decisions before Sprint 6</p>
              <p style={st({ fontSize: 12.5, color: 'var(--t2)', margin: '0 0 8px', lineHeight: 1.6 })}>REQ-011 depends on fraud vendor choice. REQ-010 and REQ-022 conflict on PCI scope.</p>
              <Btn v="ai" sm onClick={() => setView('conflicts')}><Ico n="warning" s={11} c="var(--ai)" /> View conflicts</Btn>
            </div>
          </div>

          {/* Sections — always expanded, click to focus */}
          {BRD_SECTIONS.map(sec => {
            const isSelected = selectedSection === sec.id
            const sectionComments = commentsForSection(sec.id).filter(c => !resolved.has(c.id) && !c.resolved)
            const presence = sectionPresence[sec.id]
            const review = reviewStatus[sec.id]

            return (
              <div key={sec.id}
                style={st({ marginBottom: 28, cursor: 'pointer', position: 'relative' })}
                onClick={() => { setSelectedSection(isSelected ? null : sec.id); setRightTab('threads') }}>

                {/* Section heading */}
                <div style={st({ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 })}>
                  <span className="mono" style={st({ fontSize: 9.5, color: 'var(--t3)', fontWeight: 700, flexShrink: 0 })}>{sec.n}</span>
                  <span className="bri" style={st({ fontSize: 15, fontWeight: 700, color: isSelected ? m.color : 'var(--t1)', letterSpacing: '-0.02em', flex: 1, transition: 'color 120ms' })}>{sec.title}</span>
                  {/* Comment count badge */}
                  {sectionComments.length > 0 && (
                    <span style={st({ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'var(--t3)', flexShrink: 0 })}>
                      <Ico n="comment" s={10} c="var(--t3)" />{sectionComments.length}
                    </span>
                  )}
                  {/* Review status */}
                  {review === 'approved' && (
                    <span style={st({ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--ok)', fontWeight: 600, flexShrink: 0 })}>
                      <Ico n="check" s={9} c="var(--ok)" /> Approved
                    </span>
                  )}
                  {review === 'changes' && (
                    <span style={st({ fontSize: 10, color: 'var(--err)', fontWeight: 600, flexShrink: 0 })}>Changes requested</span>
                  )}
                  {/* Presence badge */}
                  {presence && (
                    <span style={st({ fontSize: 10, color: presence.color, fontWeight: 600, flexShrink: 0 })}>
                      {presence.name}{presence.typing && jamesTyping ? ' typing…' : ' here'}
                    </span>
                  )}
                </div>

                {/* Section content with accent border when selected */}
                <div style={st({ paddingLeft: 20, borderLeft: `2px solid ${isSelected ? m.color : 'var(--bd)'}`, transition: 'border-color 150ms' })}>
                  {'body' in sec && sec.body && (
                    <p style={st({ fontSize: 13.5, color: isSelected ? 'var(--t1)' : 'var(--t2)', lineHeight: 1.8, margin: 0, transition: 'color 150ms' })}>{sec.body}</p>
                  )}
                  {'items' in sec && sec.items && (
                    <div>
                      {sec.items.slice(0, 4).map((item, j) => {
                        const reqId = item.split('—')[0].trim()
                        return (
                          <div key={j} style={st({ display: 'flex', gap: 10, padding: '7px 0', borderBottom: j < Math.min(sec.items!.length, 4) - 1 ? '1px solid var(--bd)' : 'none' })}>
                            <span className="mono" style={st({ fontSize: 10, color: m.color, fontWeight: 700, flexShrink: 0 })}>{reqId}</span>
                            <span style={st({ fontSize: 13, color: 'var(--t1)', lineHeight: 1.65 })}>{item.split('—')[1]?.trim()}</span>
                          </div>
                        )
                      })}
                      {sec.items.length > 4 && <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 7 })}>+{sec.items.length - 4} more</div>}
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div style={st({ marginTop: 10, paddingLeft: 20, display: 'flex', alignItems: 'center', gap: 8 })}>
                    <span style={st({ fontSize: 11, color: m.color, fontWeight: 500 })}>Viewing thread →</span>
                    <span style={st({ fontSize: 10.5, color: 'var(--t3)' })}>click to deselect</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Annotation + Review panel */}
      <div style={st({ width: 300, flexShrink: 0, borderLeft: '1px solid var(--bd)', display: 'flex', flexDirection: 'column' })}>

        {/* Panel tab switcher */}
        <div style={st({ display: 'flex', borderBottom: '1px solid var(--bd)', flexShrink: 0 })}>
          {([
            ['threads', `Threads${totalOpenComments > 0 ? ` · ${totalOpenComments}` : ''}`],
            ['review', 'Review'],
            ['chain', 'Chain'],
          ] as [typeof rightTab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setRightTab(t)}
              style={st({ flex: 1, padding: '9px 4px', background: 'none', border: 'none', borderBottom: `2px solid ${rightTab === t ? 'var(--ac)' : 'transparent'}`, fontSize: 11.5, fontWeight: rightTab === t ? 600 : 400, color: rightTab === t ? 'var(--t1)' : 'var(--t3)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 })}>
              {label}
            </button>
          ))}
        </div>

        <div style={st({ flex: 1, overflowY: 'auto', padding: '18px 18px 28px' })}>

          {/* ── Threads tab ── */}
          {rightTab === 'threads' && (
            selectedSection ? (
              <CommentThread
                comments={activeComments}
                resolved={resolved}
                onResolve={resolve}
                sectionColor={m.color}
                sectionLabel={BRD_SECTIONS.find(s => s.id === selectedSection)?.title || ''}
                draft={drafts[selectedSection] || ''}
                onDraftChange={v => setDrafts(d => ({ ...d, [selectedSection!]: v }))}
                onSubmit={() => submitComment(selectedSection)}
              />
            ) : (
              <div style={st({ paddingTop: 8 })}>
                <p style={st({ fontSize: 12.5, color: 'var(--t3)', margin: '0 0 20px', lineHeight: 1.6 })}>
                  Click a section in the document to view and add comments.
                </p>
                {/* All unresolved comments overview */}
                {allComments.filter(c => !resolved.has(c.id) && !c.resolved).length > 0 && (
                  <div>
                    <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 })}>Open threads</div>
                    {allComments.filter(c => !resolved.has(c.id) && !c.resolved).map((cm, i) => {
                      const u = TEAM.find(t => t.id === cm.uid)!
                      return (
                        <div key={cm.id} style={st({ display: 'flex', gap: 9, padding: '10px 0', borderBottom: '1px solid var(--bd)', cursor: 'pointer' })}
                          onClick={() => {
                            const sec = ['REQ-003', 'REQ-007'].includes(cm.req) ? 's2' : cm.req === 'REQ-011' ? 's3' : 's4'
                            setSelectedSection(sec)
                          }}>
                          <Avatar uid={cm.uid} size={20} />
                          <div style={st({ flex: 1, minWidth: 0 })}>
                            <div style={st({ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 })}>
                              <span style={st({ fontSize: 12, fontWeight: 600, color: 'var(--t1)' })}>{u.name.split(' ')[0]}</span>
                              <span className="mono" style={st({ fontSize: 9.5, color: m.color })}>{cm.req}</span>
                              <span style={st({ fontSize: 10.5, color: 'var(--t3)', marginLeft: 'auto' })}>{cm.time}</span>
                            </div>
                            <p style={st({ fontSize: 12, color: 'var(--t2)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{cm.text}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── Review tab ── */}
          {rightTab === 'review' && (
            <div>
              <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 })}>Section reviews</div>
              {BRD_SECTIONS.map((sec, i) => {
                const status = reviewStatus[sec.id]
                return (
                  <div key={sec.id} style={st({ padding: '12px 0', borderBottom: i < BRD_SECTIONS.length - 1 ? '1px solid var(--bd)' : 'none' })}>
                    <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 })}>
                      <span className="mono" style={st({ fontSize: 9.5, color: 'var(--t3)', fontWeight: 700, paddingTop: 2 })}>{sec.n}</span>
                      <span style={st({ fontSize: 12.5, fontWeight: 500, color: 'var(--t1)', flex: 1, lineHeight: 1.4 })}>{sec.title}</span>
                    </div>
                    {status ? (
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 8 })}>
                        <span style={st({ fontSize: 11, fontWeight: 600, color: status === 'approved' ? 'var(--ok)' : 'var(--err)', display: 'flex', alignItems: 'center', gap: 3 })}>
                          {status === 'approved' ? <><Ico n="check" s={9} c="var(--ok)" /> Approved</> : 'Changes requested'}
                        </span>
                        <button onClick={() => setReviewStatus(r => ({ ...r, [sec.id]: null }))}
                          style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, color: 'var(--t3)', fontFamily: 'inherit', padding: 0 })}>
                          Undo
                        </button>
                      </div>
                    ) : (
                      <div style={st({ display: 'flex', gap: 6 })}>
                        <button onClick={() => setReviewStatus(r => ({ ...r, [sec.id]: 'approved' }))}
                          style={st({ padding: '3px 10px', borderRadius: 100, background: 'rgba(78,173,121,0.08)', border: '1px solid rgba(78,173,121,0.3)', fontSize: 11, color: 'var(--ok)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 })}>
                          Approve
                        </button>
                        <button onClick={() => setReviewStatus(r => ({ ...r, [sec.id]: 'changes' }))}
                          style={st({ padding: '3px 10px', borderRadius: 100, background: 'rgba(224,85,85,0.08)', border: '1px solid rgba(224,85,85,0.25)', fontSize: 11, color: 'var(--err)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 })}>
                          Request changes
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Submit review */}
              <div style={st({ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bd)' })}>
                {Object.values(reviewStatus).filter(Boolean).length > 0 && (
                  <Btn v="primary" onClick={() => {}}>
                    Submit review
                  </Btn>
                )}
                <p style={st({ fontSize: 11, color: 'var(--t3)', margin: '10px 0 0', lineHeight: 1.5 })}>
                  {Object.values(reviewStatus).filter(v => v === 'approved').length} approved · {Object.values(reviewStatus).filter(v => v === 'changes').length} changes · {BRD_SECTIONS.length - Object.values(reviewStatus).filter(Boolean).length} pending
                </p>
              </div>
            </div>
          )}

          {/* ── Chain tab ── */}
          {rightTab === 'chain' && (
            <div>
              <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 })}>Sources</div>
              {[
                { icon: 'slack' as const, label: '#product-checkout', n: '14', color: '#E01E5A' },
                { icon: 'jira' as const, label: 'SHOP-124', n: '22', color: '#4d9fff' },
                { icon: 'github' as const, label: 'checkout-v2', n: '11', color: 'var(--t2)' },
              ].map((s, i) => (
                <div key={i} style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--bd)' : 'none' })}>
                  <Ico n={s.icon} s={13} c={s.color} />
                  <span style={st({ fontSize: 12.5, color: 'var(--t1)', flex: 1 })}>{s.label}</span>
                  <span className="mono" style={st({ fontSize: 11, color: 'var(--t3)' })}>{s.n}</span>
                </div>
              ))}

              <div style={st({ margin: '20px 0 20px', padding: '10px 12px', borderLeft: `2px solid ${m.color}` })}>
                <Ico n="doc" s={11} c={m.color} />
                <span style={st({ fontSize: 12.5, fontWeight: 700, color: m.color, marginLeft: 6 })}>This BRD · 39 requirements</span>
              </div>

              <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Downstream</div>
              {[
                { label: 'Multi-Currency PRD', type: 'prd', reqs: 18 },
                { label: 'One-Click Buy PRD', type: 'prd', reqs: 11 },
                { label: 'Payment Gateway Spec', type: 'spec', reqs: 0 },
              ].map((d, i) => (
                <div key={i} style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--bd)' : 'none' })}>
                  <div style={st({ width: 5, height: 5, borderRadius: '50%', background: d.type === 'prd' ? '#5B8DEF' : '#4EAD79', flexShrink: 0 })} />
                  <span style={st({ fontSize: 12.5, color: 'var(--t1)', flex: 1 })}>{d.label}</span>
                  {d.reqs > 0 && <span className="mono" style={st({ fontSize: 11, color: 'var(--t3)' })}>{d.reqs} reqs</span>}
                </div>
              ))}

              <div style={st({ marginTop: 20, fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Linked code</div>
              {[
                { pr: 'PR #441', desc: 'REQ-024: currency toggle', status: 'merged' },
                { pr: 'PR #438', desc: 'REQ-003: one-click flow', status: 'open' },
              ].map((pr, i) => (
                <div key={i} style={st({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 1 ? '1px solid var(--bd)' : 'none' })}>
                  <Ico n="github" s={12} c="var(--t2)" />
                  <div style={st({ flex: 1 })}>
                    <div style={st({ fontSize: 12, fontWeight: 600, color: 'var(--t1)' })}>{pr.pr}</div>
                    <div style={st({ fontSize: 11, color: 'var(--t3)' })}>{pr.desc}</div>
                  </div>
                  <span style={st({ fontSize: 10, fontWeight: 700, color: pr.status === 'merged' ? 'var(--ok)' : 'var(--ac)' })}>{pr.status}</span>
                </div>
              ))}
              <button onClick={() => setView('traceability')}
                style={st({ marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--ac)', fontFamily: 'inherit', fontWeight: 500 })}>
                Full traceability view →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Live BRD panel (real generated slice) ───────────────────────────────────
function LiveBRDPanel() {
  const { liveSource, liveBRD, setLiveBRD, prdUnlocked, setView, activeProjectId, setGenOpen } = useApp()
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({})
  const [openConflict, setOpenConflict] = useState<string | null>(null)

  if (!liveBRD) return null
  const complete = prdUnlocked
  const openConflicts = liveBRD.conflicts.filter(c => !c.resolved)

  const [conflictBusy, setConflictBusy] = useState<string | null>(null)
  const resolveConflict = async (id: string) => {
    if (!liveBRD) return
    setConflictBusy(id)
    try {
      const updated = await persistBRDConflict(liveBRD.id, id, true)
      setLiveBRD(updated)
    } catch {
      /* leave the conflict as-is; the next render reflects server truth */
    }
    setConflictBusy(null)
  }
  const resetConflict = async (id: string) => {
    if (!liveBRD) return
    try {
      const updated = await persistBRDConflict(liveBRD.id, id, false)
      setLiveBRD(updated)
    } catch {
      /* ignore */
    }
  }

  const goToReq = (id: string) => { setView('requirement') }

  return (
    <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

      {/* Header */}
      <div style={st({ padding: '30px 40px 22px', borderBottom: '1px solid var(--bd)' })}>
        <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 })}>
          <div style={st({ minWidth: 0 })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 })}>
              <span style={st({ fontSize: 9, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.07em' })}>LIVE · GENERATED</span>
              <span style={st({ fontSize: 12, color: 'var(--t3)' })}>Business Requirements Document</span>
            </div>
            <h1 className="bri" style={st({ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.045em', lineHeight: 1.15, margin: '0 0 12px', maxWidth: 640 })}>
              {liveBRD.title}
            </h1>
            <div style={st({ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' })}>
              <span>Source: <strong style={st({ fontWeight: 600 })}>{liveSource?.title}</strong></span>
              <span style={st({ color: 'var(--bd2)' })}>·</span>
              <span>by {liveBRD.author}</span>
              <span style={st({ color: 'var(--bd2)' })}>·</span>
              <span>{new Date(liveBRD.createdAt).toLocaleString()}</span>
            </div>
          </div>
          {/* Gate card */}
          <div style={st({ flexShrink: 0, width: 240, padding: 16, borderRadius: 14, background: 'var(--sf)', border: `1.5px solid ${complete ? 'var(--ok)' : 'var(--bd2)'}` })}>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 })}>
              <div style={st({ width: 8, height: 8, borderRadius: '50%', background: complete ? 'var(--ok)' : 'var(--warn)', flexShrink: 0 })} />
              <span style={st({ fontSize: 12, fontWeight: 700, color: complete ? 'var(--ok)' : 'var(--warn)' })}>
                BRD {complete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <p style={st({ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5, margin: '0 0 10px' })}>
              Requires every requirement traced to a source quote and no open conflicts ({openConflicts.length} open).
            </p>
            <Btn v="primary" sm disabled={!complete} onClick={() => setGenOpen(true)} title={complete ? undefined : 'Resolve all conflicts first'}>
              <Ico n="sparkle" s={11} c={complete ? '#0F0F0E' : 'var(--t3)'} /> Generate PRD
            </Btn>
            {!complete && <p style={st({ fontSize: 10.5, color: 'var(--t3)', margin: '7px 0 0' })}>PRD is gated until this BRD is complete.</p>}
          </div>
        </div>
        {/* Mini stats */}
        <div style={st({ display: 'flex', gap: 24, marginTop: 16 })}>
          <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800 })}>{liveBRD.requirements.length}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>requirements</div></div>
          <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800, color: openConflicts.length > 0 ? 'var(--err)' : 'var(--ok)' })}>{openConflicts.length}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>open conflicts</div></div>
          <div><span className="bri" style={st({ fontSize: 20, fontWeight: 800, color: 'var(--ok)' })}>{liveBRD.requirements.filter(r => r.sourceQuote && r.sourceQuote.trim()).length}</span><div style={st({ fontSize: 10, color: 'var(--t3)' })}>traced</div></div>
        </div>
      </div>

      <div style={st({ display: 'grid', gridTemplateColumns: '1fr 290px' })}>
        {/* Left: requirements with trace */}
        <div style={st({ padding: '26px 40px 60px', borderRight: '1px solid var(--bd)' })}>
          <div style={st({ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 })}>
            <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Extracted requirements</span>
            <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{liveBRD.requirements.length} total</span>
          </div>
          {liveBRD.requirements.length === 0 && (
            <p style={st({ fontSize: 13, color: 'var(--t3)', fontStyle: 'italic' })}>No requirements extracted — is your transcript substantive (sentences ≥ 6 words)?</p>
          )}
          {liveBRD.requirements.map((req: GeneratedRequirement, i: number) => (
            <div key={req.id} style={st({ padding: '13px 0', borderBottom: i < liveBRD.requirements.length - 1 ? '1px solid var(--bd)' : 'none' })}>
              <div style={st({ display: 'flex', alignItems: 'flex-start', gap: 12 })}>
                <button onClick={() => goToReq(req.id)} className="mono"
                  style={st({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: '#5B8DEF', fontWeight: 700, flexShrink: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' })}>
                  {req.id}
                </button>
                <div style={st({ flex: 1, minWidth: 0 })}>
                  <div style={st({ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.6 })}>{req.text}</div>
                  <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
                    <span style={st({ fontSize: 11, color: 'var(--t3)' })}>by <strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>{req.author}</strong></span>
                    <span style={st({ color: 'var(--bd2)' })}>·</span>
                    <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{req.timestamp ? new Date(req.timestamp).toLocaleString() : '—'}</span>
                    <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ok)', background: 'rgba(78,173,121,0.12)', padding: '1px 7px', borderRadius: 100 })}>traced</span>
                    {req.conflicts.length > 0 && (
                      <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--err)', background: 'rgba(224,95,106,0.12)', padding: '1px 7px', borderRadius: 100 })}>conflict</span>
                    )}
                    <button onClick={() => setExpandedReqs(p => ({ ...p, [req.id]: !p[req.id] }))}
                      style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ac)', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 3 })}>
                      source quote <Ico n={expandedReqs[req.id] ? 'chevron-d' : 'chevron-r'} s={10} c="currentColor" />
                    </button>
                  </div>
                  {expandedReqs[req.id] && (
                    <blockquote style={st({ margin: '10px 0 0', padding: '10px 14px', background: 'var(--sf)', borderLeft: '3px solid #5B8DEF', borderRadius: 8, fontSize: 12.5, fontStyle: 'italic', color: 'var(--t2)', lineHeight: 1.6 })}>
                      {req.sourceQuote}
                    </blockquote>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: conflicts + gate */}
        <div style={st({ padding: '26px 22px 60px' })}>
          <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--err)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 })}>Conflicts ({openConflicts.length} open)</div>
          {liveBRD.conflicts.length === 0 ? (
            <div style={st({ padding: '12px', background: 'rgba(78,173,121,0.08)', border: '1px solid rgba(78,173,121,0.25)', borderRadius: 10, fontSize: 12.5, color: 'var(--ok)' })}>
              No conflicts detected — this BRD is fully complete. PRD is unlocked.
            </div>
          ) : (
            <div>
              {liveBRD.conflicts.map((c: SourceConflict) => {
                const done = c.resolved
                const expanded = openConflict === c.id
                return (
                  <div key={c.id} style={st({ padding: '11px 0', borderBottom: '1px solid var(--bd)', opacity: done ? 0.5 : 1 })}>
                    <button onClick={() => { if (!done) setOpenConflict(expanded ? null : c.id) }}
                      style={st({ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', textAlign: 'left', cursor: done ? 'default' : 'pointer', fontFamily: 'inherit', padding: 0 })}>
                      <span className="mono" style={st({ fontSize: 10, color: c.severity === 'major' ? 'var(--err)' : 'var(--t3)', fontWeight: 700 })}>{c.id}</span>
                      <span style={st({ flex: 1, fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.45 })}>{c.title}</span>
                      {done ? <Ico n="check" s={11} c="var(--ok)" /> : <Ico n={expanded ? 'chevron-d' : 'chevron-r'} s={11} c="var(--t3)" />}
                    </button>
                    {expanded && !done && (
                      <div style={st({ marginTop: 10, padding: '10px 12px', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 10, fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 })}>
                        <div style={st({ marginBottom: 6 })}>{c.desc}</div>
                        <div style={st({ color: 'var(--t3)', marginBottom: 10 })}><strong style={st({ fontWeight: 600, color: 'var(--t2)' })}>Fix:</strong> {c.fix}</div>
                        <Btn sm v="primary" onClick={() => resolveConflict(c.id)}>Mark resolved</Btn>
                      </div>
                    )}
                    {done && (
                      <button onClick={() => resetConflict(c.id)} style={st({ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted' })}>Reopen</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={st({ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--bd)' })}>
            <div style={st({ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 })}>Traceability</div>
            <p style={st({ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, margin: 0 })}>
              Every requirement carries its <strong style={st({ fontWeight: 600 })}>source quote</strong>, author, and timestamp back to {liveSource?.title}. No orphan requirements.
            </p>
          </div>
          <div style={st({ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bd)' })}>
            <Btn v="ghost" sm onClick={() => setView('traceability')}><Ico n="link" s={12} c="var(--t2)" /> Full traceability view</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main DocumentView shell ───────────────────────────────────────────────────
// Renders the LIVE generated BRD for the currently selected document. There is
// NO mock fallback: if no real BRD is open, we show an honest empty/load state.
function NoDocumentOpen({ hasId }: { hasId: boolean }) {
  const { setGenOpen, cancelDocument, openBRD, activeBRDId } = useApp()
  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 6 })}>
      <Trace size={64} mood="thinking" />
      {hasId ? (
        <>
          <p className="bri" style={st({ fontSize: 19, fontWeight: 800, color: 'var(--t1)', margin: '18px 0 6px', letterSpacing: '-0.03em' })}>Couldn’t load this document</p>
          <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 20px', maxWidth: 380, textAlign: 'center' })}>
            The BRD didn’t resolve from the server (it may have failed to load). Retry, or go back to your documents.
          </p>
          <div style={st({ display: 'flex', gap: 8 })}>
            <Btn v="primary" onClick={() => { if (activeBRDId) openBRD(activeBRDId) }}><Ico n="refresh" s={12} c="#0F0F0E" /> Retry</Btn>
            <Btn v="ghost" onClick={cancelDocument}><Ico n="arrow-l" s={12} c="var(--t2)" /> Back to documents</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="bri" style={st({ fontSize: 19, fontWeight: 800, color: 'var(--t1)', margin: '18px 0 6px', letterSpacing: '-0.03em' })}>No document open</p>
          <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 20px', maxWidth: 380, textAlign: 'center' })}>
            Open a BRD from your documents, or generate a new one from a source.
          </p>
          <div style={st({ display: 'flex', gap: 8 })}>
            <Btn v="primary" onClick={() => setGenOpen(true)}><Ico n="sparkle" s={12} c="#0F0F0E" /> Generate a document</Btn>
            <Btn v="ghost" onClick={cancelDocument}><Ico n="folder" s={12} c="var(--t2)" /> Browse documents</Btn>
          </div>
        </>
      )}
    </div>
  )
}

export function DocumentView() {
  const { liveBRD, activeBRDId } = useApp()

  if (liveBRD) return <LiveBRDPanel />

  return <NoDocumentOpen hasId={!!activeBRDId} />
}
