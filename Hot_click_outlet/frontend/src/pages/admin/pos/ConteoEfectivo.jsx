import { useState } from 'react'
import { DENOM, formatMontoPos } from './posHelpers'

export default function ConteoEfectivo({ label, onTotal, totalColor = '#34d399' }) {
  const [qtys, setQtys] = useState(() => Object.fromEntries(DENOM.map(d => [d.v, ''])))

  const setQty = (v, val) => {
    const next = { ...qtys, [v]: val }
    setQtys(next)
    onTotal(DENOM.reduce((s, d) => s + (Number.parseInt(next[d.v]) || 0) * d.v, 0))
  }

  const total = DENOM.reduce((s, d) => s + (Number.parseInt(qtys[d.v]) || 0) * d.v, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{label}</p>
        <span className="text-xl font-black" style={{ color: totalColor }}>₡{formatMontoPos(total)}</span>
      </div>
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {DENOM.map(d => {
          const qty = qtys[d.v]
          const sub = (Number.parseInt(qty) || 0) * d.v
          return (
            <div key={d.v} className="flex items-center gap-2 sm:gap-3 px-3 py-2 border-b last:border-0"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="w-20 shrink-0 text-center py-1 rounded-lg text-xs font-bold"
                style={{ backgroundColor: d.bg, color: d.color, border: `1px solid ${d.color}40` }}>
                {d.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setQty(d.v, Math.max(0, (Number.parseInt(qty) || 0) - 1))}
                  className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--hc-muted)' }}>−</button>
                <input
                  type="number" min={0} value={qty}
                  onChange={e => setQty(d.v, Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="w-14 text-center text-sm font-bold rounded-lg outline-none py-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
                />
                <button type="button" onClick={() => setQty(d.v, (Number.parseInt(qty) || 0) + 1)}
                  className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--hc-muted)' }}>+</button>
              </div>
              <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: sub > 0 ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
                {sub > 0 ? `₡${formatMontoPos(sub)}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
