import type { DocType } from '../../types'
import { DOC_META } from '../../data'
import { Ico } from './Icon'
import { st } from '../../lib/utils'

export function DocTag({ type, size = 'sm' }: { type: DocType; size?: 'sm' | 'xs' }) {
  const m = DOC_META[type]
  return (
    <span style={st({
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: size === 'xs' ? 10 : 11, fontWeight: 700,
      color: m.color, background: `${m.color}18`,
      padding: size === 'xs' ? '2px 6px 2px 5px' : '3px 9px 3px 7px',
      borderRadius: 20, letterSpacing: '0.02em', whiteSpace: 'nowrap',
    })}>
      <Ico n={m.icon as any} s={size === 'xs' ? 10 : 11} c={m.color} />
      {m.label}
    </span>
  )
}
