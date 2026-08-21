import { useState } from 'react'
import { DOC_META } from '../data'
import { useApp } from '../context/AppContext'
import { saveSource, requestBRD } from '../lib/api'
import { Ico } from './ui/Icon'
import { Btn } from './ui/Button'
import { Trace } from './Trace'
import { st } from '../lib/utils'
import type { DocType } from '../types'

interface Props {
  onClose: () => void
  onGenerate: () => void
}

const SAMPLE_TRANSCRIPT = `Katrina: We need to cut checkout abandonment by 30% this quarter.
James: The gateway must support payments in 14 currencies with real-time rates.
Omar: Checkout should complete in three steps max from cart to confirmation.
Katrina: Returning customers must have one-click buy with saved payment methods.
James: I disagree — one-click must not skip the step-up auth on orders over $500.
Omar: Fraud detection must flag suspicious transactions before authorisation.
Katrina: Payment API calls must stay under 800ms at the 99th percentile.
James: All payment data must be PCI DSS Level 1 compliant.
Omar: The checkout UI must be WCAG 2.1 AA accessible.
Katrina: We must not charge users for payment method storage.`

export function DocGenModal({ onClose, onGenerate }: Props) {
  const { prdUnlocked, setLiveSource, setLiveBRD, setServerStatus, setGenOpen } = useApp()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [docType, setDocType] = useState<DocType | null>(null)
  const [brief, setBrief] = useState('')
  // Real ingest field.
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [genProgress, setGenProgress] = useState(0)
  const [genStep, setGenStep] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canGenerate = transcript.trim().length > 0
  const isPrd = docType === 'prd'
  const prdLocked = isPrd && !prdUnlocked

  const runGenerate = async () => {
    if (!canGenerate) return
    setStep(4)
    setError(null)
    const steps = ['Reading transcript…', 'Attributing speakers…', 'Extracting requirements…', 'Detecting conflicts…', 'Resolving gates…', 'Finalising document…']
    let i = 0
    const tick = () => {
      if (i >= steps.length) return
      setGenStep(steps[i])
      setGenProgress(Math.round(((i + 1) / steps.length) * 100))
      i++
    }
    tick()
    const timer = setInterval(tick, 420)

    try {
      const { source, status } = await saveSource({ title: title.trim() || brief.trim().slice(0, 60) || 'Ingested transcript', rawText: transcript, author: 'Current user' })
      setServerStatus(status)
      setLiveSource(source)
      const { brd, status: genStatus } = await requestBRD(source)
      setServerStatus(genStatus)
      setLiveBRD(brd)
      clearInterval(timer)
      setGenProgress(100)
      setTimeout(() => { setGenOpen(false); onGenerate() }, 350)
    } catch (e) {
      clearInterval(timer)
      setError(e instanceof Error ? e.message : 'Generation failed.')
      setStep(3)
    }
  }

  return (
    <div
      style={st({ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' })}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={st({ width: 560, background: 'var(--sf)', borderRadius: 22, overflow: 'hidden', border: '1.5px solid var(--bd2)', boxShadow: 'var(--sh2)' })}>
        {/* Header */}
        <div style={st({ padding: '18px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 14 })}>
          <Trace size={38} mood={step === 4 ? 'thinking' : step === 1 ? 'wave' : 'excited'} />
          <div>
            <div className="bri" style={st({ fontSize: 15, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' })}>
              {step === 1 ? "What are we building?" : step === 2 ? "Tell Trace what you need" : step === 3 ? "Paste your transcript" : "Trace is generating…"}
            </div>
            <div style={st({ fontSize: 12, color: 'var(--t3)' })}>
              {step < 4 ? `Step ${step} of 3 · ${['', 'Pick type', 'Write brief', 'Ingest a source'][step]}` : 'Hang tight, this takes a moment'}
            </div>
          </div>
          <button onClick={onClose} style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 4 })}>
            <Ico n="close" s={18} c="var(--t2)" />
          </button>
        </div>

        <div style={st({ padding: '22px' })}>
          {/* Step 1: Doc type (PRD gated on complete BRD) */}
          {step === 1 && (
            <div>
              <div style={st({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 })}>
                {(Object.entries(DOC_META) as [DocType, typeof DOC_META[DocType]][]).map(([key, m]) => {
                  const isPrdKey = key === 'prd'
                  const locked = isPrdKey && !prdUnlocked
                  return (
                    <button
                      key={key}
                      disabled={locked}
                      onClick={() => { if (!locked) { setDocType(key); setStep(2) } }}
                      style={st({ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 13, background: 'none', border: `1.5px solid ${locked ? 'var(--bd)' : 'var(--bd)'}`, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'inherit', opacity: locked ? 0.55 : 1, transition: 'all 0.12s' })}
                    >
                      <div style={st({ width: 36, height: 36, borderRadius: 10, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                        <Ico n={m.icon as any} s={17} c={m.color} />
                      </div>
                      <div>
                        <div style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 })}>{m.label}</div>
                        <div style={st({ fontSize: 11.5, color: 'var(--t3)' })}>{locked ? 'Requires a complete BRD' : m.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p style={st({ fontSize: 11.5, color: 'var(--t3)', margin: '14px 4px 0', lineHeight: 1.5 })}>
                <Ico n="lock" s={10} c="var(--t3)" /> PRD generation unlocks only after a BRD is complete (every requirement traced &amp; no open conflicts).
              </p>
            </div>
          )}

          {/* Step 2: Brief */}
          {step === 2 && docType && (
            <div>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 14px', background: `${DOC_META[docType].color}0D`, borderRadius: 12, border: `1.5px solid ${DOC_META[docType].color}30` })}>
                <Ico n={DOC_META[docType].icon as any} s={20} c={DOC_META[docType].color} />
                <span style={st({ fontSize: 13.5, fontWeight: 600, color: DOC_META[docType].color })}>{DOC_META[docType].label}</span>
                <button onClick={() => { setStep(1); setDocType(null) }} style={st({ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t3)', fontFamily: 'inherit' })}>Change</button>
              </div>
              <label style={st({ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 })}>In 2–3 sentences, what is this document for?</label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="e.g. We need a BRD for overhauling the checkout experience. The goal is to reduce cart abandonment and support multi-currency payments."
                style={st({ width: '100%', minHeight: 100, background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.65, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' })}
              />
              <div style={st({ display: 'flex', justifyContent: 'flex-end', marginTop: 20 })}>
                <Btn v="primary" onClick={() => setStep(3)}>Continue <Ico n="arrow-r" s={14} c="#0F0F0E" /></Btn>
              </div>
            </div>
          )}

          {/* Step 3: Real ingest — paste a transcript */}
          {step === 3 && (
            <div>
              {error && (
                <div style={st({ marginBottom: 14, padding: '10px 12px', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 10, fontSize: 12.5, color: 'var(--err)', lineHeight: 1.5 })}>
                  {error}
                </div>
              )}
              <label style={st({ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Source title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Checkout overhaul — kickoff sync"
                style={st({ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 })}
              />
              <label style={st({ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>
                Meeting transcript / note
              </label>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Paste a meeting transcript or Loom-style note here. Lines like 'Name: statement' capture the author for traceability."
                style={st({ width: '100%', minHeight: 180, background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.65, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' })}
              />
              <div style={st({ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' })}>
                <button
                  onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
                  style={st({ background: 'none', border: '1px dashed var(--bd2)', borderRadius: 8, padding: '5px 11px', fontSize: 11.5, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'inherit' })}
                >
                  Try a sample checkout transcript
                </button>
                <span style={st({ fontSize: 11, color: 'var(--t3)' })}>{transcript.length} chars</span>
              </div>
              <div style={st({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 })}>
                <button onClick={() => setStep(2)} style={st({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' })}>
                  <Ico n="arrow-l" s={14} c="var(--t3)" /> Back
                </button>
                <Btn v="ai" onClick={runGenerate} disabled={!canGenerate} title={canGenerate ? undefined : 'Paste a transcript first'}>
                  <Trace size={20} mood="excited" /> Generate with Trace
                </Btn>
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
