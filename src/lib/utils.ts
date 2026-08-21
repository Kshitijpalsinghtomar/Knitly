import type { CSSProperties } from 'react'

export function st(...o: (CSSProperties | false | null | undefined)[]): CSSProperties {
  return Object.assign({}, ...o.filter(Boolean))
}
