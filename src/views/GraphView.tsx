import { useState } from 'react'
import { GRAPH_NODES, GRAPH_EDGES, NODE_COL } from '../data'
import { Ico } from '../components/ui/Icon'
import { Btn } from '../components/ui/Button'
import { st } from '../lib/utils'

export function GraphView() {
  const [hov, setHov] = useState<string | null>(null)
  const nm = Object.fromEntries(GRAPH_NODES.map(n => [n.id, n]))

  return (
    <div style={st({ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' })}>
      <div style={st({ padding: '12px 24px', borderBottom: '1px solid var(--bd)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 })}>
        <div style={st({ display: 'flex', alignItems: 'center', gap: 7 })}>
          <Ico n="network" s={16} c="var(--ac)" />
          <span className="bri" style={st({ fontSize: 14.5, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' })}>Knowledge Graph</span>
        </div>
        <div style={st({ display: 'flex', gap: 14 })}>
          {Object.entries(NODE_COL).map(([type, color]) => (
            <div key={type} style={st({ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--t2)' })}>
              <div style={st({ width: 8, height: 8, borderRadius: '50%', background: color })} />
              {type}
            </div>
          ))}
        </div>
        <div style={st({ marginLeft: 'auto' })}><Btn v="ghost" sm>Export SVG</Btn></div>
      </div>

      <div style={st({ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', backgroundImage: 'radial-gradient(ellipse 55% 35% at 70% 25%, rgba(91,141,239,0.06) 0%, transparent 55%)' })}>
        <div style={st({ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, var(--bd) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.5 })} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {GRAPH_EDGES.map(([a, b], i) => {
            const na = nm[a], nb = nm[b]
            if (!na || !nb) return null
            const lit = hov === a || hov === b
            return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={lit ? 'var(--ac)' : 'var(--bd2)'} strokeWidth={lit ? 2 : 1.2} />
          })}
          {GRAPH_NODES.map(node => {
            const col = NODE_COL[node.type]
            const r = hov === node.id ? 24 : 18
            return (
              <g key={node.id} onMouseEnter={() => setHov(node.id)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
                <circle cx={node.x} cy={node.y} r={r} fill={`${col}18`} stroke={col} strokeWidth={hov === node.id ? 2.5 : 1.5} />
                <circle cx={node.x} cy={node.y} r={5} fill={col} />
                <text x={node.x} y={node.y + 32} textAnchor="middle" fill="var(--t2)" fontSize="11" fontFamily="JetBrains Mono,monospace">{node.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
