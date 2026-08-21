import type { ReactNode } from 'react'
import { st } from '../../lib/utils'

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span style={st({
      fontSize: 10.5, fontWeight: 700, color: '#fff',
      background: color || 'var(--err)', padding: '1px 7px', borderRadius: 20,
    })}>
      {children}
    </span>
  )
}

export function SLabel({ children, mb }: { children: ReactNode; mb?: number }) {
  return (
    <p style={st({
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--t3)',
      margin: `0 0 ${mb ?? 12}px`,
    })}>
      {children}
    </p>
  )
}

export function Hr({ vertical }: { vertical?: boolean }) {
  return vertical
    ? <div style={st({ width: 1, height: 18, background: 'var(--bd)' })} />
    : <div style={st({ height: 1, background: 'var(--bd)', flexShrink: 0 })} />
}
