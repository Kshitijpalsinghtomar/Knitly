import { useState } from 'react'
import { TEAM_DATA, PROJECTS } from '../data'
import { Ico } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { Btn } from '../components/ui/Button'
import { st } from '../lib/utils'
import type { IcoName } from '../types'

const roleColors: Record<string, string> = { owner: '#F5A623', admin: '#5B8DEF', member: '#4EAD79', viewer: '#9B6FE8' }
const roleIcons: Record<string, IcoName> = { owner: 'crown', admin: 'shield', member: 'user', viewer: 'eye' }

export function TeamView() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  return (
    <div style={st({ flex: 1, overflowY: 'auto', background: 'var(--bg)' })}>

      {/* Header */}
      <div style={st({ padding: '44px 52px 32px', borderBottom: '1px solid var(--bd)' })}>
        <div style={st({ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' })}>
          <div>
            <h1 className="bri" style={st({ fontSize: 44, fontWeight: 800, letterSpacing: '-0.055em', color: 'var(--t1)', margin: '0 0 8px', lineHeight: 1 })}>
              Team
            </h1>
            <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: 0 })}>{TEAM_DATA.length} members · {TEAM_DATA.filter(t => t.online).length} online now</p>
          </div>

          {/* Role distribution — numbers, no boxes */}
          <div style={st({ display: 'flex', gap: 32, alignItems: 'flex-end', marginBottom: 4 })}>
            {[['owner', '1'], ['admin', '1'], ['member', '2'], ['viewer', '1']].map(([role, count]) => (
              <div key={role} style={st({ textAlign: 'right' })}>
                <div className="bri" style={st({ fontSize: 28, fontWeight: 800, color: roleColors[role], letterSpacing: '-0.05em', lineHeight: 1 })}>{count}</div>
                <div style={st({ fontSize: 10.5, color: 'var(--t3)', textTransform: 'capitalize', marginTop: 3 })}>{role}{parseInt(count) > 1 ? 's' : ''}</div>
              </div>
            ))}
            <Btn v="primary" onClick={() => setInviteOpen(true)}><Ico n="invite" s={14} c="#0F0F0E" /> Invite</Btn>
          </div>
        </div>
      </div>

      {/* Members list — rows, no cards */}
      <div style={st({ padding: '0 52px 52px' })}>
        {TEAM_DATA.map((u, i) => (
          <div
            key={u.id}
            style={st({
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 0',
              borderBottom: '1px solid var(--bd)',
            })}
          >
            {/* Avatar + online dot */}
            <div style={st({ position: 'relative', flexShrink: 0 })}>
              <Avatar uid={u.id} size={38} />
              {u.online && <div style={st({ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--ok)', border: '2px solid var(--bg)' })} />}
            </div>

            {/* Identity */}
            <div style={st({ flex: 1, minWidth: 0 })}>
              <div style={st({ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 })}>
                <span style={st({ fontSize: 15, fontWeight: 600, color: 'var(--t1)' })}>{u.name}</span>
                <span style={st({ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: roleColors[u.role], textTransform: 'capitalize' })}>
                  <Ico n={roleIcons[u.role]} s={10} c={roleColors[u.role]} /> {u.role}
                </span>
              </div>
              <div style={st({ fontSize: 12.5, color: 'var(--t3)' })}>{u.email}</div>
            </div>

            {/* Projects stacked dots */}
            <div style={st({ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 })}>
              <div style={st({ display: 'flex', gap: 0 })}>
                {u.projects.slice(0, 3).map(pid => {
                  const p = PROJECTS.find(pr => pr.id === pid)
                  return p ? <div key={pid} title={p.name} style={st({ width: 16, height: 16, borderRadius: 4, background: p.gradient, border: '2px solid var(--bg)', marginLeft: -3 })} /> : null
                })}
              </div>
              <span style={st({ fontSize: 12, color: 'var(--t3)' })}>{u.projects.length} project{u.projects.length > 1 ? 's' : ''}</span>
            </div>

            {/* Last active */}
            <div style={st({ fontSize: 12, color: 'var(--t3)', flexShrink: 0, width: 96, textAlign: 'right' })}>{u.lastActive}</div>

            {/* Actions */}
            {u.role !== 'owner' && (
              <div style={st({ display: 'flex', gap: 6, flexShrink: 0 })}>
                <Btn v="ghost" sm>Edit role</Btn>
                <Btn v="danger" sm>Remove</Btn>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div
          style={st({ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' })}
          onClick={e => e.target === e.currentTarget && setInviteOpen(false)}
        >
          <div style={st({ width: 440, background: 'var(--sf)', borderRadius: 20, border: '1.5px solid var(--bd2)', overflow: 'hidden', boxShadow: 'var(--sh2)' })}>
            <div style={st({ padding: '18px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
              <div className="bri" style={st({ fontSize: 16, fontWeight: 800, color: 'var(--t1)' })}>Invite a teammate</div>
              <button onClick={() => setInviteOpen(false)} style={st({ background: 'none', border: 'none', cursor: 'pointer' })}>
                <Ico n="close" s={18} c="var(--t2)" />
              </button>
            </div>
            <div style={st({ padding: '22px' })}>
              <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Email address</label>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={st({ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 })}
              />
              <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 })}>Role</label>
              <div style={st({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 22 })}>
                {[['admin', 'Can edit and manage integrations'], ['member', 'Can read and comment'], ['viewer', 'Can view documents only']].map(([role, desc]) => (
                  <button
                    key={role}
                    onClick={() => setInviteRole(role)}
                    style={st({ padding: '10px 12px', borderRadius: 10, background: inviteRole === role ? `${roleColors[role]}14` : 'none', border: `1.5px solid ${inviteRole === role ? roleColors[role] + '50' : 'var(--bd)'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' })}
                  >
                    <div style={st({ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 })}>
                      <Ico n={roleIcons[role]} s={13} c={roleColors[role]} />
                      <span style={st({ fontSize: 13, fontWeight: 600, color: 'var(--t1)', textTransform: 'capitalize' })}>{role}</span>
                    </div>
                    <span style={st({ fontSize: 11.5, color: 'var(--t3)' })}>{desc}</span>
                  </button>
                ))}
              </div>
              <Btn v="primary" full onClick={() => { setInviteOpen(false); setInviteEmail('') }}>
                <Ico n="send" s={14} c="#0F0F0E" /> Send invite
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
