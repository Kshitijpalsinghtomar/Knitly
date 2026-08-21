import { st } from '../../lib/utils'
import { TEAM } from '../../data'

export function Avatar({ uid, size = 28, ring }: { uid: string; size?: number; ring?: boolean }) {
  const u = TEAM.find(t => t.id === uid)
  if (!u) return null
  return (
    <div
      title={u.name}
      style={st({
        width: size, height: size, borderRadius: '50%', background: u.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, color: '#fff',
        letterSpacing: '-0.01em', flexShrink: 0,
        border: ring ? '2px solid var(--bg)' : undefined,
      })}
    >
      {u.initials}
    </div>
  )
}

export function AvatarRow({ uids, size = 24 }: { uids: string[]; size?: number }) {
  return (
    <div style={st({ display: 'flex' })}>
      {uids.slice(0, 5).map((id, i) => (
        <div key={id} style={st({ marginLeft: i > 0 ? -size * 0.3 : 0, zIndex: 10 - i })}>
          <Avatar uid={id} size={size} ring />
        </div>
      ))}
    </div>
  )
}
