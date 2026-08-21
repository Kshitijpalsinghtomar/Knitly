import { useState } from 'react'
import { NOTIFICATIONS_DATA } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { st } from '../lib/utils'
import type { IcoName } from '../types'

const notifIcons: Record<string, IcoName> = {
  conflict: 'warning', review: 'eye', sync: 'refresh', invite: 'invite', resolve: 'check',
}

export function NotificationsView() {
  const [notifs, setNotifs] = useState(NOTIFICATIONS_DATA)
  const markAll = () => setNotifs(p => p.map(n => ({ ...n, read: true })))
  const unread = notifs.filter(n => !n.read).length

  return (
    <div style={st({ flex: 1, overflowY: 'auto', padding: '44px 48px', background: 'var(--bg)' })}>
      <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 })}>
        <div>
          <h1 className="bri" style={st({ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--t1)', margin: '0 0 5px' })}>Notifications</h1>
          <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: 0 })}>{unread} unread</p>
        </div>
        <Btn v="ghost" onClick={markAll}><Ico n="check" s={14} c="var(--t2)" /> Mark all read</Btn>
      </div>

      <div style={st({ display: 'flex', flexDirection: 'column', gap: 6 })}>
        {notifs.map(n => (
          <div
            key={n.id}
            style={st({ display: 'flex', gap: 12, padding: '14px 16px', background: n.read ? 'transparent' : 'var(--sf)', borderRadius: 12, border: '1.5px solid', borderColor: n.read ? 'transparent' : 'var(--bd)', transition: 'background 0.15s', cursor: 'pointer' })}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sf)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--sf)'; (e.currentTarget as HTMLElement).style.borderColor = n.read ? 'transparent' : 'var(--bd)' }}
            onClick={() => setNotifs(p => p.map(item => item.id === n.id ? { ...item, read: true } : item))}
          >
            <div style={st({ width: 36, height: 36, borderRadius: 10, background: `${n.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
              <Ico n={notifIcons[n.type] || 'bell'} s={16} c={n.color} />
            </div>
            <div style={st({ flex: 1 })}>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 })}>
                <span style={st({ fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: 'var(--t1)' })}>{n.title}</span>
                {!n.read && <div style={st({ width: 7, height: 7, borderRadius: '50%', background: 'var(--ac)', flexShrink: 0 })} />}
              </div>
              <p style={st({ fontSize: 12.5, color: 'var(--t2)', margin: '0 0 4px', lineHeight: 1.5 })}>{n.sub}</p>
              <span style={st({ fontSize: 11.5, color: 'var(--t3)' })}>{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
