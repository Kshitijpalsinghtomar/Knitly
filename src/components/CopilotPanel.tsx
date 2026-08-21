import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { PROJECTS } from '../data'
import { Ico } from './ui/Icon'
import { Avatar } from './ui/Avatar'
import { Trace } from './Trace'
import { st } from '../lib/utils'

const INITIAL_MSGS = [
  { role: 'ai', text: "Hey! I went through Checkout Flow v2 and found 39 requirements across 4 sources. 4 active conflicts — CON-004 is the one to tackle first. It breaks your PCI compliance scope entirely. Want me to walk through it?" },
  { role: 'user', text: "Yeah, start with the big ones." },
  { role: 'ai', text: "CON-004: REQ-010 puts you in PCI DSS Level 1. REQ-022 wants a live card preview in the browser. Raw card numbers in your DOM = immediate PCI violation.\n\nFix: Stripe.js iFrame. Card data never hits your DOM. PCI scope stays clean. Want me to draft the updated requirement?" },
]

const QUICK_ACTIONS_INITIAL = ['Draft fix', 'All conflicts', 'Summarise', 'Link Jira']
const QUICK_ACTIONS_AFTER = ['Draft REQ-022', 'Open CON-004', 'Generate spec', 'Notify team']

// Parse message text and highlight entity refs like REQ-xxx, CON-xxx, PR #xxx
function MessageText({ text, onEntity }: { text: string; onEntity?: (ref: string) => void }) {
  const parts = text.split(/\b(REQ-\d+|CON-\d+|PR #\d+)\b/)
  return (
    <>
      {parts.map((part, i) => {
        if (/^(REQ-\d+|CON-\d+|PR #\d+)$/.test(part)) {
          const isConflict = part.startsWith('CON-')
          const isPR = part.startsWith('PR')
          const color = isConflict ? 'var(--err)' : isPR ? 'var(--ok)' : 'var(--ai)'
          const bg = isConflict ? 'rgba(224,85,85,0.10)' : isPR ? 'rgba(78,173,121,0.10)' : 'rgba(155,111,232,0.12)'
          return (
            <button
              key={i}
              onClick={() => onEntity?.(part)}
              style={st({
                display: 'inline',
                background: bg,
                color,
                border: 'none',
                borderRadius: 4,
                padding: '1px 5px',
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              })}
            >
              {part}
            </button>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// Typing indicator — three animated dots
function TypingDots() {
  return (
    <div style={st({ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' })}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%', background: 'var(--ai)',
            display: 'inline-block',
            animation: `traceDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

export function CopilotPanel() {
  const { activeProjectId, setView, setActiveReqId } = useApp()
  const activeProject = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0]
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState(INITIAL_MSGS)
  const [thinking, setThinking] = useState(false)
  const [quickActions, setQuickActions] = useState(QUICK_ACTIONS_INITIAL)
  const [msgCount, setMsgCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, thinking])

  // Add keyframe animation once
  useEffect(() => {
    if (document.getElementById('trace-dot-style')) return
    const style = document.createElement('style')
    style.id = 'trace-dot-style'
    style.textContent = `
      @keyframes traceDot {
        0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    `
    document.head.appendChild(style)
  }, [])

  const handleEntity = (ref: string) => {
    if (ref.startsWith('REQ-')) { setActiveReqId(ref); setView('requirement') }
    else if (ref.startsWith('CON-')) { setView('conflicts') }
  }

  const send = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setMsgs(p => [...p, { role: 'user', text: msg }])
    setInput('')
    setThinking(true)
    const newCount = msgCount + 1
    setMsgCount(newCount)
    if (newCount >= 1) setQuickActions(QUICK_ACTIONS_AFTER)

    setTimeout(() => {
      setThinking(false)
      setMsgs(p => [...p, {
        role: 'ai',
        text: msg.toLowerCase().includes('draft')
          ? "Drafting the updated requirement now. REQ-022 will be revised to use Stripe.js iFrame — card data stays off your DOM. CON-004 will be marked resolved once you approve the draft."
          : "Cross-referencing your stakeholder map and linked PRs. CON-001 also needs attention — one-click buy vs. biometric step-up above $500. Want me to run through the fix for that too?",
      }])
    }, 1400)
  }

  return (
    <div style={st({ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--bd)', background: 'var(--bg)', overflow: 'hidden' })}>

      {/* Header */}
      <div style={st({ padding: '13px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 })}>
        <Trace size={36} mood="thinking" />
        <div style={st({ flex: 1, minWidth: 0 })}>
          <div className="bri" style={st({ fontSize: 13.5, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' })}>Trace</div>
          <div style={st({ fontSize: 11, color: 'var(--ai)', display: 'flex', alignItems: 'center', gap: 5 })}>
            <span style={st({ width: 5, height: 5, borderRadius: '50%', background: 'var(--ai)', flexShrink: 0, display: 'inline-block',
              boxShadow: '0 0 0 2px color-mix(in srgb, var(--ai) 25%, transparent)' })} />
            Watching {activeProject.name}
          </div>
        </div>
        <button
          onClick={() => setView('home')}
          style={st({ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--t3)' })}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
        >
          <Ico n="close" s={14} c="currentColor" />
        </button>
      </div>

      {/* Messages */}
      <div style={st({ flex: 1, overflowY: 'auto', padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 20 })}>
        {msgs.map((m, i) => (
          m.role === 'ai' ? (
            /* AI message — no bubble, just prose with left accent */
            <div key={i}>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 })}>
                <Trace size={16} mood="default" />
                <span style={st({ fontSize: 9.5, fontWeight: 700, color: 'var(--ai)', letterSpacing: '0.1em', textTransform: 'uppercase' })}>Trace</span>
              </div>
              <div style={st({ paddingLeft: 14, borderLeft: '2px solid var(--ai)', display: 'flex', flexDirection: 'column', gap: 6 })}>
                {m.text.split('\n\n').map((para, j) => (
                  <p key={j} style={st({ fontSize: 13, lineHeight: 1.75, color: 'var(--t1)', margin: 0 })}>
                    <MessageText text={para} onEntity={handleEntity} />
                  </p>
                ))}
              </div>
            </div>
          ) : (
            /* User message — indented, muted */
            <div key={i} style={st({ display: 'flex', gap: 9, alignItems: 'flex-start' })}>
              <Avatar uid="u1" size={20} />
              <div style={st({ flex: 1 })}>
                <div style={st({ fontSize: 9.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 })}>You</div>
                <p style={st({ fontSize: 13, lineHeight: 1.65, color: 'var(--t2)', margin: 0 })}>{m.text}</p>
              </div>
            </div>
          )
        ))}

        {/* Typing indicator */}
        {thinking && (
          <div>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 })}>
              <Trace size={16} mood="thinking" />
              <span style={st({ fontSize: 9.5, fontWeight: 700, color: 'var(--ai)', letterSpacing: '0.1em', textTransform: 'uppercase' })}>Trace</span>
            </div>
            <div style={st({ paddingLeft: 14, borderLeft: '2px solid var(--ai)' })}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={st({ padding: '10px 12px 14px', borderTop: '1px solid var(--bd)', flexShrink: 0 })}>
        {/* Context-aware quick actions */}
        <div style={st({ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 })}>
          {quickActions.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              style={st({
                background: 'transparent', border: '1px solid var(--bd)',
                borderRadius: 100, padding: '4px 10px',
                fontSize: 11.5, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color 120ms, border-color 120ms',
              })}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ai)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ai)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div style={st({ display: 'flex', gap: 6, alignItems: 'center' })}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask Trace…"
            style={st({
              flex: 1, background: 'var(--sf)', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '8px 12px', fontSize: 13,
              color: 'var(--t1)', outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 120ms',
            })}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--ai)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--bd)' }}
          />
          <button
            onClick={() => send()}
            style={st({
              width: 34, height: 34, flexShrink: 0,
              background: input.trim() ? 'var(--ai)' : 'var(--bd)',
              border: 'none', borderRadius: 9, cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms',
            })}
          >
            <Ico n="send" s={13} c={input.trim() ? '#fff' : 'var(--t3)'} />
          </button>
        </div>
      </div>
    </div>
  )
}
