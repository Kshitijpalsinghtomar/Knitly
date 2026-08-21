import type { ReactNode, CSSProperties } from 'react'
import type { BtnV } from '../../types'
import { st } from '../../lib/utils'

export function Btn({ children, v = 'default', onClick, sm, full, type }: {
  children: ReactNode
  v?: BtnV
  onClick?: () => void
  sm?: boolean
  full?: boolean
  type?: 'button' | 'submit'
}) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, border: 'none', borderRadius: 10, fontFamily: 'inherit',
    fontWeight: 600, cursor: 'pointer', width: full ? '100%' : undefined,
    fontSize: sm ? 12 : 13, padding: sm ? '6px 12px' : '9px 18px',
    transition: 'opacity 0.1s, background 0.1s', letterSpacing: '-0.01em',
  }
  const variants: Record<BtnV, CSSProperties> = {
    primary: { background: 'var(--ac)', color: '#0F0F0E' },
    ghost:   { background: 'transparent', color: 'var(--t2)', border: '1.5px solid var(--bd2)' },
    danger:  { background: 'rgba(224,85,85,0.10)', color: 'var(--err)', border: '1.5px solid rgba(224,85,85,0.25)' },
    default: { background: 'var(--bd)', color: 'var(--t1)' },
    ai:      { background: 'linear-gradient(135deg,#9B6FE8,#5B8DEF)', color: '#fff' },
  }
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      style={st(base, variants[v])}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.78' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
    >
      {children}
    </button>
  )
}
