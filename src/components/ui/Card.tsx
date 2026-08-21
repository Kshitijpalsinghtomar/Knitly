import type { ReactNode, CSSProperties } from 'react'
import { st } from '../../lib/utils'

export function Card({ children, onClick, accent, padded = true, style: xs }: {
  children: ReactNode
  onClick?: () => void
  accent?: string
  padded?: boolean
  style?: CSSProperties
}) {
  const base: CSSProperties = {
    background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 16,
    overflow: 'hidden', borderLeft: accent ? `3px solid ${accent}` : undefined,
    cursor: onClick ? 'pointer' : undefined,
    transition: 'border-color 0.12s',
    ...(padded ? { padding: 18 } : {}), ...xs,
  }
  const hov = onClick ? {
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
      ;(e.currentTarget as HTMLElement).style.borderColor = accent ? `${accent}55` : 'var(--bd2)'
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)'
    },
  } : {}
  return <div style={base} onClick={onClick} {...hov}>{children}</div>
}
