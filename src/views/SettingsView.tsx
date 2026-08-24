import { useState } from 'react'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { SLabel, Badge } from '../components/ui/Badge'
import { st } from '../lib/utils'
import type { IcoName } from '../types'

type SettingsTab = 'profile' | 'workspace' | 'notifications' | 'api' | 'billing'

const TABS: [SettingsTab, string, IcoName][] = [
  ['profile', 'Profile', 'user'],
  ['workspace', 'Workspace', 'settings'],
  ['notifications', 'Notifications', 'bell'],
  ['api', 'API & Webhooks', 'key'],
  ['billing', 'Billing', 'credit'],
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={st({ width: 44, height: 26, borderRadius: 13, background: on ? 'var(--ok)' : 'var(--bd)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0, border: 'none', padding: 0 })}
    >
      <div style={st({ width: 18, height: 18, borderRadius: '50%', background: 'var(--sf)', position: 'absolute', top: 4, left: on ? 22 : 4, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' })} />
    </button>
  )
}

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [profileName, setProfileName] = useState('Katrina M.')
  const [profileEmail, setProfileEmail] = useState('katrina@acme.com')
  const [wsName, setWsName] = useState('Acme Corp')
  const [notifPrefs, setNotifPrefs] = useState({
    conflict: true, review: true, generated: true, sync: false, invite: true, digest: false,
  })

  const inputStyle = st({ width: '100%', background: 'var(--sf)', border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: 'var(--t1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const })

  return (
    <div style={st({ flex: 1, display: 'flex', overflow: 'hidden' })}>
      {/* Settings sidebar */}
      <div style={st({ width: 200, flexShrink: 0, borderRight: '1px solid var(--bd)', background: 'var(--bg)', padding: '28px 12px' })}>
        <p style={st({ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', padding: '0 8px', marginBottom: 8, margin: '0 0 8px' })}>Settings</p>
        {TABS.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={st({ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 9, background: tab === key ? 'var(--acd)' : 'none', border: 'none', borderLeft: `2.5px solid ${tab === key ? 'var(--ac)' : 'transparent'}`, color: tab === key ? 'var(--t1)' : 'var(--t2)', fontSize: 13, fontWeight: tab === key ? 600 : 400, cursor: 'pointer', marginBottom: 1, fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.1s' })}
            onMouseEnter={e => { if (tab !== key) (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
            onMouseLeave={e => { if (tab !== key) (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}
          >
            <Ico n={icon} s={15} c={tab === key ? 'var(--ac)' : 'var(--t3)'} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={st({ flex: 1, overflowY: 'auto', padding: '40px 48px', background: 'var(--bg)' })}>

        {tab === 'profile' && (
          <div style={st({ maxWidth: 540 })}>
            <h2 className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '0 0 24px', letterSpacing: '-0.03em' })}>Profile</h2>
            <div style={st({ display: 'flex', alignItems: 'center', gap: 16, padding: '20px', background: 'var(--sf)', borderRadius: 14, border: '1.5px solid var(--bd)', marginBottom: 24 })}>
              <div style={st({ width: 60, height: 60, borderRadius: '50%', background: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' })}>KM</div>
              <div>
                <div style={st({ fontSize: 14.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 })}>{profileName}</div>
                <div style={st({ fontSize: 13, color: 'var(--t3)' })}>{profileEmail}</div>
              </div>
              <Btn v="ghost" sm>Change avatar</Btn>
            </div>
            {[['Full name', profileName, setProfileName] as const, ['Email address', profileEmail, setProfileEmail] as const].map(([label, val, setter]) => (
              <div key={label} style={st({ marginBottom: 18 })}>
                <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>{label}</label>
                <input value={val} onChange={e => setter(e.target.value)} style={inputStyle} />
              </div>
            ))}
            <div style={st({ marginBottom: 18 })}>
              <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Timezone</label>
              <select style={st({ ...inputStyle, appearance: 'none' as any })}>
                <option>Europe/London (GMT+0)</option>
                <option>America/New_York (GMT-5)</option>
                <option>Asia/Dubai (GMT+4)</option>
              </select>
            </div>
            <Btn v="primary"><Ico n="check" s={14} c="#0F0F0E" /> Save changes</Btn>
          </div>
        )}

        {tab === 'workspace' && (
          <div style={st({ maxWidth: 540 })}>
            <h2 className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '0 0 24px', letterSpacing: '-0.03em' })}>Workspace</h2>
            <div style={st({ marginBottom: 18 })}>
              <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Workspace name</label>
              <input value={wsName} onChange={e => setWsName(e.target.value)} style={inputStyle} />
            </div>
            <div style={st({ marginBottom: 24 })}>
              <label style={st({ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 })}>Plan</label>
              <div style={st({ padding: '14px 16px', background: 'var(--sf)', border: '1.5px solid var(--acd)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                <div>
                  <div style={st({ fontSize: 14, fontWeight: 700, color: 'var(--ac)' })}>Business Plan</div>
                  <div style={st({ fontSize: 12.5, color: 'var(--t3)' })}>5 members · Unlimited docs · Priority AI</div>
                </div>
                <Btn v="ghost" sm>Upgrade</Btn>
              </div>
            </div>
            <Btn v="primary"><Ico n="check" s={14} c="#0F0F0E" /> Save changes</Btn>
            <div style={st({ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--bd)' })}>
              <div style={st({ fontSize: 13.5, fontWeight: 700, color: 'var(--err)', marginBottom: 8 })}>Danger zone</div>
              <p style={st({ fontSize: 13, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.6 })}>Deleting the workspace will permanently remove all projects, documents, and requirements. This cannot be undone.</p>
              <Btn v="danger"><Ico n="trash" s={14} c="var(--err)" /> Delete workspace</Btn>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div style={st({ maxWidth: 540 })}>
            <h2 className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '0 0 24px', letterSpacing: '-0.03em' })}>Notifications</h2>
            {[
              { key: 'conflict' as const, label: 'Conflict detected', desc: 'When Trace finds a requirement conflict' },
              { key: 'review' as const, label: 'Review requested', desc: 'When a teammate asks for your review' },
              { key: 'generated' as const, label: 'Document generated', desc: 'When Trace finishes generating a document' },
              { key: 'sync' as const, label: 'Integration synced', desc: 'When a source integration completes a sync' },
              { key: 'invite' as const, label: 'Team member joined', desc: 'When someone accepts a workspace invite' },
              { key: 'digest' as const, label: 'Weekly digest', desc: 'A weekly summary of activity across all projects' },
            ].map(n => (
              <div key={n.key} style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--bd)' })}>
                <div>
                  <div style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 })}>{n.label}</div>
                  <div style={st({ fontSize: 12.5, color: 'var(--t3)' })}>{n.desc}</div>
                </div>
                <Toggle on={notifPrefs[n.key]} onChange={v => setNotifPrefs(p => ({ ...p, [n.key]: v }))} />
              </div>
            ))}
          </div>
        )}

        {tab === 'api' && (
          <div style={st({ maxWidth: 580 })}>
            <h2 className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '0 0 8px', letterSpacing: '-0.03em' })}>API & Webhooks</h2>
            <p style={st({ fontSize: 13.5, color: 'var(--t2)', margin: '0 0 28px', lineHeight: 1.6 })}>Use the Knitly API to push requirements programmatically or receive events via webhooks.</p>
            <SLabel>API Keys</SLabel>
            <div style={st({ marginTop: 10, marginBottom: 24 })}>
              <div style={st({ padding: '14px 16px', background: 'var(--sf)', borderRadius: 12, border: '1.5px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 })}>
                <Ico n="key" s={16} c="var(--ac)" />
                <span className="mono" style={st({ fontSize: 12.5, color: 'var(--t1)', flex: 1 })}>tl_prod_••••••••••••••••••••••••3a9f</span>
                <Btn v="ghost" sm><Ico n="copy" s={12} c="var(--t2)" /> Copy</Btn>
                <Btn v="danger" sm>Revoke</Btn>
              </div>
              <Btn v="ghost" sm><Ico n="plus" s={12} c="var(--t2)" /> Generate new key</Btn>
            </div>
            <SLabel>Webhooks</SLabel>
            <div style={st({ marginTop: 10 })}>
              <div style={st({ padding: '14px 16px', background: 'var(--sf)', borderRadius: 12, border: '1.5px solid var(--bd)', marginBottom: 8 })}>
                <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 })}>
                  <div style={st({ display: 'flex', alignItems: 'center', gap: 8 })}>
                    <Ico n="webhook" s={14} c="var(--ok)" />
                    <span style={st({ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' })}>conflict.detected</span>
                    <span style={st({ fontSize: 10.5, color: 'var(--ok)', background: 'rgba(78,173,121,0.12)', padding: '1px 7px', borderRadius: 20 })}>● Active</span>
                  </div>
                  <Btn v="ghost" sm>Edit</Btn>
                </div>
                <span className="mono" style={st({ fontSize: 11.5, color: 'var(--t3)' })}>https://api.acme.com/hooks/Knitly</span>
              </div>
              <Btn v="ghost" sm><Ico n="plus" s={12} c="var(--t2)" /> Add webhook</Btn>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div style={st({ maxWidth: 540 })}>
            <h2 className="bri" style={st({ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: '0 0 24px', letterSpacing: '-0.03em' })}>Billing</h2>
            <div style={st({ padding: '18px 20px', background: 'var(--sf)', borderRadius: 14, border: '1.5px solid var(--acd)', marginBottom: 24 })}>
              <div style={st({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 })}>
                <div>
                  <div style={st({ fontSize: 16, fontWeight: 700, color: 'var(--ac)' })}>Business Plan</div>
                  <div style={st({ fontSize: 13, color: 'var(--t3)' })}>$79 / month · renews Jan 1, 2025</div>
                </div>
                <Badge color="var(--ok)">Active</Badge>
              </div>
              <div style={st({ display: 'flex', gap: 8 })}>
                <Btn v="ghost" sm>Manage plan</Btn>
                <Btn v="ghost" sm>View invoices</Btn>
              </div>
            </div>

            {/* Plan comparison */}
            <div style={st({ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 })}>
              {[
                { name: 'Team', price: '$29', features: ['5 projects', '50 docs', '10 members', '4 integrations'] },
                { name: 'Business', price: '$79', features: ['Unlimited projects', '200 docs', '25 members', 'All integrations'], current: true },
                { name: 'Enterprise', price: 'Custom', features: ['Unlimited everything', 'SSO', 'Webhooks', 'Dedicated support'] },
              ].map(plan => (
                <div key={plan.name} style={st({ padding: '14px', background: plan.current ? 'var(--acd)' : 'var(--sf)', border: `1.5px solid ${plan.current ? 'var(--ac)' : 'var(--bd)'}`, borderRadius: 12 })}>
                  <div style={st({ fontSize: 13, fontWeight: 700, color: plan.current ? 'var(--ac)' : 'var(--t1)', marginBottom: 2 })}>{plan.name}</div>
                  <div className="bri" style={st({ fontSize: 20, fontWeight: 800, color: plan.current ? 'var(--ac)' : 'var(--t1)', marginBottom: 10 })}>{plan.price}<span style={st({ fontSize: 11, fontWeight: 400, color: 'var(--t3)' })}>{plan.price !== 'Custom' ? '/mo' : ''}</span></div>
                  {plan.features.map(f => (
                    <div key={f} style={st({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--t2)', marginBottom: 4 })}>
                      <Ico n="check" s={11} c="var(--ok)" /> {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <SLabel>Usage this month</SLabel>
            <div style={st({ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 })}>
              {[
                ['Documents generated', '23 / 200', 11.5],
                ['AI processing hours', '4.2 / 20h', 21],
                ['Team members', '5 / 25', 20],
                ['Integrations', '4 / 8', 50],
              ].map(([label, val, pct]) => (
                <div key={label as string} style={st({ padding: '12px 16px', background: 'var(--sf)', borderRadius: 12, border: '1.5px solid var(--bd)' })}>
                  <div style={st({ display: 'flex', justifyContent: 'space-between', marginBottom: 8 })}>
                    <span style={st({ fontSize: 13, color: 'var(--t1)', fontWeight: 500 })}>{label as string}</span>
                    <span style={st({ fontSize: 12.5, color: 'var(--t3)' })}>{val as string}</span>
                  </div>
                  <div style={st({ height: 4, background: 'var(--bd)', borderRadius: 10, overflow: 'hidden' })}>
                    <div style={st({ height: '100%', background: 'var(--ac)', borderRadius: 10, width: `${pct as number}%` })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
