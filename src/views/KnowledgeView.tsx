import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { KB_TEMPLATES, KB_SHARED_REQS, KB_PROPOSED, DOC_META } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { DocTag } from '../components/ui/DocTag'
import { Trace } from '../components/Trace'
import { st } from '../lib/utils'

export function KnowledgeView() {
  const { setView } = useApp()
  const [tab, setTab] = useState<'templates' | 'shared' | 'glossary' | 'proposed'>('templates')
  const [proposed, setProposed] = useState(KB_PROPOSED)

  const platformTemplates = KB_TEMPLATES.filter(t => t.platform)
  const workspaceTemplates = KB_TEMPLATES.filter(t => !t.platform)
  const pendingCount = proposed.filter(p => p.status === 'pending').length

  const featured = [...platformTemplates].sort((a, b) => (b.uses || 0) - (a.uses || 0))[0]
  const restPlatform = platformTemplates.filter(t => t.id !== featured?.id)

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>

      {/* Header */}
      <div style={st({ padding: '36px 52px 0', borderBottom: '1px solid var(--bd)', background: 'var(--bg)', flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 })}>
          <div>
            <h1 className="bri" style={st({ fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--t1)', margin: '0 0 4px' })}>
              Knowledge Base
            </h1>
            <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0 })}>
              Shared templates, reusable requirements, and company standards.
            </p>
          </div>
          <Btn v="primary"><Ico n="plus" s={14} c="#0F0F0E" /> Add to library</Btn>
        </div>

        <div style={st({ display: 'flex', gap: 0 })}>
          {([
            ['templates', 'Templates'],
            ['shared', 'Shared requirements'],
            ['glossary', 'Glossary'],
            ['proposed', `Proposed${pendingCount > 0 ? ` · ${pendingCount}` : ''}`],
          ] as [typeof tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={st({
                padding: '9px 18px 10px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === key ? 'var(--ac)' : 'transparent'}`,
                fontSize: 13, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? 'var(--t1)' : 'var(--t3)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.12s', marginBottom: -1, position: 'relative',
              })}
            >
              {label}
              {key === 'proposed' && pendingCount > 0 && (
                <span style={st({ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--ac)', position: 'absolute', top: 9, right: 10 })} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

        {tab === 'templates' && (
          <div>
            {/* TraceLayer platform templates */}
            <div style={st({ padding: '28px 52px 0' })}>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 })}>
                <span style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>TraceLayer templates</span>
                <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '2px 8px', borderRadius: 100, letterSpacing: '0.04em' })}>Platform</span>
              </div>
            </div>

            {/* Featured template — full-width editorial row, not a box */}
            {featured && (() => {
              const fm = DOC_META[featured.type]
              return (
                <div
                  onClick={() => setView('document')}
                  style={st({
                    display: 'flex', alignItems: 'center', gap: 20,
                    padding: '22px 52px',
                    borderTop: '1px solid var(--bd)',
                    borderBottom: '1px solid var(--bd)',
                    cursor: 'pointer',
                    background: 'var(--sf)',
                    transition: 'background 0.1s',
                    position: 'relative',
                  })}
                  onMouseEnter={e => { const t = e.currentTarget.querySelector('.tmpl-title') as HTMLElement; if (t) t.style.color = 'var(--ac)' }}
                  onMouseLeave={e => { const t = e.currentTarget.querySelector('.tmpl-title') as HTMLElement; if (t) t.style.color = 'var(--t1)' }}
                >
                  {/* Left accent line */}
                  <div style={st({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: fm.color })} />

                  <div style={st({ width: 42, height: 42, borderRadius: 10, background: `${fm.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                    <Ico n={fm.icon as any} s={20} c={fm.color} />
                  </div>
                  <div style={st({ flex: 1 })}>
                    <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 })}>
                      <span className="bri tmpl-title" style={st({ fontSize: 18, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1, transition: 'color 120ms' })}>{featured.name}</span>
                      <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ai)', background: 'var(--aid)', padding: '2px 8px', borderRadius: 100 })}>Most used</span>
                    </div>
                    <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0, lineHeight: 1.5 })}>{featured.desc}</p>
                  </div>
                  <div style={st({ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 })}>
                    <div style={st({ textAlign: 'right' })}>
                      <div className="mono" style={st({ fontSize: 22, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 })}>{featured.uses}×</div>
                      <div style={st({ fontSize: 10, color: 'var(--t3)', marginTop: 2 })}>used</div>
                    </div>
                    <Btn v="primary" onClick={() => setView('document')}>Use template</Btn>
                  </div>
                </div>
              )
            })()}

            {/* Rest of platform templates — clean rows */}
            {restPlatform.map((tmpl, i) => {
              const m = DOC_META[tmpl.type]
              return (
                <TemplateRow key={tmpl.id} tmpl={tmpl} m={m} onUse={() => setView('document')} isLast={i === restPlatform.length - 1} />
              )
            })}

            {/* Workspace templates section */}
            <div style={st({ padding: '40px 52px 0', borderTop: '1px solid var(--bd)', marginTop: 16 })}>
              <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 })}>
                <div style={st({ display: 'flex', alignItems: 'center', gap: 10 })}>
                  <span style={st({ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' })}>Acme Corp templates</span>
                  <span style={st({ fontSize: 10, fontWeight: 700, color: 'var(--ok)', background: 'rgba(78,173,121,0.12)', padding: '2px 8px', borderRadius: 100 })}>Private</span>
                </div>
                <Btn v="ghost" sm><Ico n="plus" s={12} c="var(--t2)" /> Propose template</Btn>
              </div>
            </div>

            {workspaceTemplates.length > 0 ? (
              workspaceTemplates.map((tmpl, i) => {
                const m = DOC_META[tmpl.type]
                return (
                  <TemplateRow key={tmpl.id} tmpl={tmpl} m={m} onUse={() => setView('document')} isLast={i === workspaceTemplates.length - 1} />
                )
              })
            ) : (
              <div style={st({ padding: '0 52px 52px' })}>
                <div style={st({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px', borderTop: '1px solid var(--bd)', textAlign: 'center' })}>
                  <Trace size={48} mood="thinking" />
                  <p style={st({ fontSize: 14, color: 'var(--t2)', margin: '16px 0 18px' })}>No workspace templates yet.<br />Propose the first one to set a standard.</p>
                  <Btn v="ghost" sm><Ico n="plus" s={12} c="var(--t2)" /> Propose first template</Btn>
                </div>
              </div>
            )}

            <div style={st({ height: 52 })} />
          </div>
        )}

        {tab === 'shared' && (
          <div style={st({ padding: '28px 52px 52px' })}>
            <div style={st({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 })}>
              <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: 0, lineHeight: 1.7, maxWidth: 480 })}>
                Requirements shared across multiple projects. Refer to these instead of rewriting — any change here propagates everywhere they're used.
              </p>
              <Btn v="ghost" sm><Ico n="plus" s={12} c="var(--t2)" /> Propose requirement</Btn>
            </div>

            <div style={st({ borderTop: '1px solid var(--bd)' })}>
              {KB_SHARED_REQS.map((req, i) => (
                <div
                  key={req.id}
                  style={st({
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--bd)',
                    transition: 'background 0.1s',
                  })}
                >
                  <span className="mono" style={st({ fontSize: 11, color: 'var(--ac)', fontWeight: 700, flexShrink: 0, minWidth: 72 })}>{req.code}</span>
                  <span style={st({ fontSize: 14, color: 'var(--t1)', flex: 1, fontWeight: 500 })}>{req.title}</span>
                  <span style={st({ fontSize: 12, color: 'var(--t3)', flexShrink: 0 })}>{req.used} projects</span>
                  <Btn v="ghost" sm>Add to doc</Btn>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'glossary' && (
          <div style={st({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px', textAlign: 'center' })}>
            <Trace size={56} mood="thinking" />
            <p className="bri" style={st({ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: '20px 0 6px' })}>Glossary coming soon</p>
            <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 22px', maxWidth: 360, lineHeight: 1.7 })}>
              Add company-specific terms so Trace understands your context when generating documents. One term defined here beats a paragraph of clarification in every prompt.
            </p>
            <Btn v="primary"><Ico n="plus" s={14} c="#0F0F0E" /> Add first term</Btn>
          </div>
        )}

        {tab === 'proposed' && (
          <div style={st({ padding: '28px 52px 52px' })}>
            <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 480 })}>
              Members propose templates and shared requirements. Admins approve before they go live.
            </p>

            {proposed.length === 0 ? (
              <div style={st({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px', textAlign: 'center', borderTop: '1px solid var(--bd)' })}>
                <Trace size={48} mood="done" />
                <p style={st({ fontSize: 14, color: 'var(--t2)', margin: '16px 0 0' })}>All caught up. No pending proposals.</p>
              </div>
            ) : (
              <div style={st({ borderTop: '1px solid var(--bd)' })}>
                {proposed.map((item, i) => (
                  <div
                    key={item.id}
                    style={st({
                      padding: '20px 0', display: 'flex', alignItems: 'flex-start',
                      justifyContent: 'space-between', gap: 16,
                      borderBottom: '1px solid var(--bd)',
                    })}
                  >
                    <div style={st({ flex: 1 })}>
                      <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 })}>
                        {'type' in item ? <DocTag type={item.type as any} size="xs" /> : (
                          <span className="mono" style={st({ fontSize: 10.5, color: 'var(--ac)', fontWeight: 700 })}>Shared req</span>
                        )}
                        <Badge color="var(--warn)">Pending approval</Badge>
                      </div>
                      <div style={st({ fontSize: 14.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 })}>
                        {'name' in item ? item.name : item.title}
                      </div>
                      {'desc' in item && (
                        <p style={st({ fontSize: 13, color: 'var(--t2)', margin: 0, lineHeight: 1.55 })}>{item.desc}</p>
                      )}
                      <div style={st({ fontSize: 11.5, color: 'var(--t3)', marginTop: 8 })}>Proposed by {item.proposedBy}</div>
                    </div>
                    <div style={st({ display: 'flex', gap: 6, flexShrink: 0 })}>
                      <Btn v="primary" sm onClick={() => setProposed(p => p.map(x => x.id === item.id ? { ...x, status: 'approved' } : x))}>
                        <Ico n="check" s={12} c="#0F0F0E" /> Approve
                      </Btn>
                      <Btn v="danger" sm onClick={() => setProposed(p => p.filter(x => x.id !== item.id))}>
                        <Ico n="x" s={12} c="var(--err)" /> Reject
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateRow({ tmpl, m, onUse, isLast }: {
  tmpl: typeof KB_TEMPLATES[0]
  m: typeof DOC_META[keyof typeof DOC_META]
  onUse: () => void
  isLast: boolean
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={st({
        display: 'flex', alignItems: 'center', gap: 0,
        borderBottom: '1px solid var(--bd)',
        background: 'transparent',
        cursor: 'pointer',
        padding: '0 52px',
      })}
      onClick={onUse}
    >
      {/* Color dot */}
      <div style={st({ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0, marginRight: 18 })} />

      <div style={st({ width: 32, height: 32, borderRadius: 8, background: `${m.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 16 })}>
        <Ico n={m.icon as any} s={14} c={m.color} />
      </div>

      <div style={st({ flex: 1, padding: '14px 0' })}>
        <div style={st({ fontSize: 13.5, fontWeight: 600, color: hover ? 'var(--ac)' : 'var(--t1)', marginBottom: 2, transition: 'color 120ms' })}>{tmpl.name}</div>
        <div style={st({ fontSize: 12, color: 'var(--t3)', lineHeight: 1.4 })}>{tmpl.desc}</div>
      </div>

      <div style={st({ padding: '0 28px', textAlign: 'right', whiteSpace: 'nowrap' })}>
        <span className="mono" style={st({ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' })}>{tmpl.uses}×</span>
        <div style={st({ fontSize: 10, color: 'var(--t3)', marginTop: 1 })}>used</div>
      </div>

      <div style={st({ opacity: hover ? 1 : 0, transition: 'opacity 0.12s', flexShrink: 0 })}>
        <Btn v="primary" sm onClick={onUse}>Use template</Btn>
      </div>
    </div>
  )
}
