import { useState } from 'react'
import { DOC_META, INTEGRATIONS_DATA } from '../data'
import { Ico } from './ui/Icon'
import { Btn } from './ui/Button'
import { Trace } from './Trace'
import { st } from '../lib/utils'
import type { DocType } from '../types'

interface Props {
  onClose: () => void
  onGenerate: () => void
}

export function DocGenModal({ onClose, onGenerate }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [docType, setDocType] = useState<DocType | null>(null)
  const [brief, setBrief] = useState('')
  const [sources, setSources] = useState<Set<string>>(new Set(['github', 'slack', 'jira']))
  const [genProgress, setGenProgress] = useState(0)
  const [genStep, setGenStep] = useState('')

  const connectedSources = INTEGRATIONS_DATA.filter(i => i.on)

  const startGen = () => {
    setStep(4)
    const steps = ['Reading Slack threads…', 'Analysing Jira epics…', 'Cross-referencing GitHub PRs…', 'Extracting requirements…', 'Detecting conflicts…', 'Writing sections…', 'Flagging open decisions…', 'Finalising document…']
    let i = 0
    const tick = () => {
      if (i >= steps.length) { setTimeout(onGenerate, 400); return }
      setGenStep(steps[i])
      setGenProgress(Math.round(((i + 1) / steps.length) * 100))
      i++
      setTimeout(tick, 700)
    }
    tick()
  }

  return (
    <div
      style={st({ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' })}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={st({ width: 540, background: 'var(--sf)', borderRadius: 22, overflow: 'hidden', border: '1.5px solid var(--bd2)', boxShadow: 'var(--sh2)' })}>
        {/* Header */}
        <div style={st({ padding: '18px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 14 })}>
          <Trace size={38} mood={step === 4 ? 'thinking' : step === 1 ? 'wave' : 'excited'} />
          <div>
            <div className="bri" style={st({ fontSize: 15, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' })}>
              {step === 1 ? "What are we building?" : step === 2 ? "Tell Trace what you need" : step === 3 ? "Choose your sources" : "Trace is generating…"}
            </div>
            <div style={st({ fontSize: 12, color: 'var(--t3)' })}>
              {step < 4 ? `Step ${step} of 3 · ${['', 'Pick type', 'Write brief', 'Select sources'][step]}` : 'Hang tight, this takes ~30 seconds'}
            </div>
          </div>
          <button onClick={onClose} style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 4 })}>
            <Ico n="close" s={18} c="var(--t2)" />
          </button>
        </div>

        <div style={st({ padding: '22px' })}>
          {/* Step 1: Doc type */}
          {step === 1 && (
            <div style={st({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 })}>
              {(Object.entries(DOC_META) as [DocType, typeof DOC_META[DocType]][]).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => { setDocType(key); setStep(2) }}
                  style={st({ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 13, background: 'none', border: `1.5px solid var(--bd)`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' })}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${m.color}0D`; (e.currentTarget as HTMLElement).style.borderColor = `${m.color}50` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
                >
                  <div style={st({ width: 36, height: 36, borderRadius: 10, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                    <Ico n={m.icon as any} s={17} c={m.color} />
                  </div>
                  <div>
                    <div style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 })}>{m.label}</div>
                    <div style={st({ fontSize: 11.5, color: 'var(--t3)' })}>{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Brief */}
          {step === 2 && docType && (
            <div>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 14px', background: `${DOC_META[docType].color}0D`, borderRadius: 12, border: `1.5px solid ${DOC_META[docType].color}30` })}>
                <Ico n={DOC_META[docType].icon as any} s={20} c={DOC_META[docType].color} />
                <span style={st({ fontSize: 13.5, fontWeight: 600, color: DOC_META[docType].color })}>{DOC_META[docType].label}</span>
                <button onClick={() => setStep(1)} style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t3)', fontFamily: 'inherit' })}>Change</button>
              </div>
              <label style={st({ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 })}>In 2–3 sentences, what is this document for?</label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="e.g. We need a BRD for overhauling the checkout experience. The goal is to reduce cart abandonment and support multi-currency payments."
                style={st({ width: '100%', minHeight: 110, background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.65, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' })}
              />
              <p style={st({ fontSize: 12, color: 'var(--t3)', margin: '8px 0 0' })}>Trace uses this to prioritise sources and structure sections correctly.</p>
              <div style={st({ display: 'flex', justifyContent: 'flex-end', marginTop: 20 })}>
                <Btn v="primary" onClick={() => setStep(3)}>Continue <Ico n="arrow-r" s={14} c="#0F0F0E" /></Btn>
              </div>
            </div>
          )}

          {/* Step 3: Sources */}
          {step === 3 && (
            <div>
              <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 16px', lineHeight: 1.6 })}>Which connected tools should Trace read from?</p>
              <div style={st({ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 })}>
                {connectedSources.map(src => {
                  const on = sources.has(src.id)
                  const toggle2 = () => setSources(prev => { const n = new Set(prev); n.has(src.id) ? n.delete(src.id) : n.add(src.id); return n })
                  return (
                    <button
                      key={src.id}
                      onClick={toggle2}
                      style={st({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: on ? `${src.color}14` : 'transparent', border: `1.5px solid ${on ? src.color + '40' : 'var(--bd)'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' })}
                    >
                      <div style={st({ width: 32, height: 32, borderRadius: 9, background: `${src.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                        <Ico n={src.icon} s={16} c={src.hi} />
                      </div>
                      <div style={st({ flex: 1 })}>
                        <div style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' })}>{src.name}</div>
                        <div style={st({ fontSize: 11.5, color: 'var(--t3)' })}>{src.syncedItems} items · synced {src.lastSync}</div>
                      </div>
                      <div style={st({ width: 20, height: 20, borderRadius: '50%', background: on ? 'var(--ok)' : 'var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' })}>
                        {on && <Ico n="check" s={11} c="#fff" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div style={st({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                <button onClick={() => setStep(2)} style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' })}>
                  <Ico n="arrow-l" s={14} c="var(--t3)" /> Back
                </button>
                <Btn v="ai" onClick={startGen}><Trace size={20} mood="excited" /> Generate with Trace</Btn>
              </div>
            </div>
          )}

          {/* Step 4: Generating */}
          {step === 4 && (
            <div style={st({ textAlign: 'center', padding: '10px 0' })}>
              <div style={st({ display: 'flex', justifyContent: 'center', marginBottom: 20 })}>
                <Trace size={72} mood="thinking" />
              </div>
              <p className="bri" style={st({ fontSize: 16, fontWeight: 800, color: 'var(--t1)', margin: '0 0 6px', letterSpacing: '-0.02em' })}>
                {genProgress < 100 ? 'Trace is working…' : 'Almost there!'}
              </p>
              <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 24px' })}>{genStep}</p>
              <div style={st({ width: '100%', height: 8, background: 'var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 })}>
                <div style={st({ height: '100%', background: 'linear-gradient(90deg,#9B6FE8,#5B8DEF)', borderRadius: 10, width: `${genProgress}%`, transition: 'width 0.6s ease' })} />
              </div>
              <p style={st({ fontSize: 12, color: 'var(--t3)' })}>{genProgress}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
