import type { TraceMood } from '../types'

export function Trace({ size = 48, mood = 'default' }: { size?: number; mood?: TraceMood }) {
  const ex = mood === 'wave' ? 16.5 : 16
  const ex2 = mood === 'wave' ? 31.5 : 31
  const mouth =
    mood === 'excited' || mood === 'wave' ? 'M15 33 Q24 41 33 33'
    : mood === 'done'     ? 'M14 33 Q24 42 34 33'
    : mood === 'thinking' ? 'M18 34 Q24 37 30 34'
    : 'M16 33 Q24 39 32 33'

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9B6FE8" /><stop offset="1" stopColor="#5B8DEF" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="17" fill="url(#tg)" />
      <rect x="5" y="5" width="22" height="12" rx="7" fill="white" fillOpacity="0.13" />
      <circle cx={ex}  cy="22" r="5.5" fill="white" />
      <circle cx={ex2} cy="22" r="5.5" fill="white" />
      <circle cx={ex + 1.5}  cy="23" r="2.8" fill="#160840" />
      <circle cx={ex2 + 1.5} cy="23" r="2.8" fill="#160840" />
      <circle cx={ex + 2.5}  cy="21.5" r="1.1" fill="white" />
      <circle cx={ex2 + 2.5} cy="21.5" r="1.1" fill="white" />
      <path d={mouth} stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {mood === 'excited' && <>
        <path d="M40 7L42 4M41 12L45 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M6 9L3 6M7 14L3 12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55" />
      </>}
      {mood === 'thinking' && <>
        <circle cx="39" cy="9" r="2.2" fill="white" fillOpacity="0.7" />
        <circle cx="42" cy="5" r="1.5" fill="white" fillOpacity="0.45" />
        <circle cx="44.5" cy="2" r="0.9" fill="white" fillOpacity="0.25" />
      </>}
      {mood === 'done' && <path d="M37 7L39 10.5L44 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      {mood === 'wave' && <path d="M44 20 Q49 15 47 10 Q45 5 40 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />}
    </svg>
  )
}

export function ProjDoodle({ pid, size = 38 }: { pid: string; size?: number }) {
  const S = { stroke: 'white' as const, strokeWidth: '2' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const }
  if (pid === 'p1') return <svg width={size} height={size} viewBox="0 0 38 38" fill="none"><path d="M4 5h4l5 20h18l4-13H12" {...S}/><circle cx="15" cy="29" r="3" fill="white" fillOpacity="0.85"/><circle cx="25" cy="29" r="3" fill="white" fillOpacity="0.85"/><path d="M22 12h5M23 16h3" {...S} strokeOpacity="0.55"/></svg>
  if (pid === 'p2') return <svg width={size} height={size} viewBox="0 0 38 38" fill="none"><rect x="9" y="3" width="20" height="32" rx="5" {...S}/><line x1="19" y1="29" x2="19" y2="29.01" stroke="white" strokeWidth="3" strokeLinecap="round"/><line x1="14" y1="7" x2="24" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.55"/><rect x="13" y="12" width="12" height="9" rx="2" {...S} strokeOpacity="0.55"/></svg>
  return <svg width={size} height={size} viewBox="0 0 38 38" fill="none"><circle cx="19" cy="8" r="5" fill="white" fillOpacity="0.9"/><circle cx="6" cy="28" r="5" fill="white" fillOpacity="0.9"/><circle cx="32" cy="28" r="5" fill="white" fillOpacity="0.9"/><path d="M19 13L6 23M19 13L32 23M10 28L28 28" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/><circle cx="19" cy="8" r="2" fill="#160840"/><circle cx="6" cy="28" r="2" fill="#160840"/><circle cx="32" cy="28" r="2" fill="#160840"/></svg>
}
