import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const DENOM = [
  { v: 50000, label: '₡50.000', color: '#c0392b', bg: 'rgba(192,57,43,0.15)' },
  { v: 20000, label: '₡20.000', color: '#27ae60', bg: 'rgba(39,174,96,0.15)'  },
  { v: 10000, label: '₡10.000', color: '#e67e22', bg: 'rgba(230,126,34,0.15)' },
  { v:  5000, label: '₡5.000',  color: '#2980b9', bg: 'rgba(41,128,185,0.15)' },
  { v:  2000, label: '₡2.000',  color: '#8e44ad', bg: 'rgba(142,68,173,0.15)' },
  { v:  1000, label: '₡1.000',  color: '#795548', bg: 'rgba(121,85,72,0.15)'  },
  { v:   500, label: '₡500',    color: '#9e9e9e', bg: 'rgba(158,158,158,0.15)'},
  { v:   100, label: '₡100',    color: '#ffc107', bg: 'rgba(255,193,7,0.15)'  },
  { v:    50, label: '₡50',     color: '#ffc107', bg: 'rgba(255,193,7,0.12)'  },
]

function ConteoEfectivo({ label, onTotal }) {
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
        <span className="text-xl font-black" style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</span>
      </div>
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {DENOM.map(d => {
          const qty = qtys[d.v]
          const sub = (Number.parseInt(qty) || 0) * d.v
          return (
            <div key={d.v} className="flex items-center gap-3 px-3 py-2 border-b last:border-0"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="w-20 shrink-0 text-center py-1 rounded-lg text-xs font-bold"
                style={{ backgroundColor: d.bg, color: d.color, border: `1px solid ${d.color}40` }}>
                {d.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setQty(d.v, Math.max(0, (Number.parseInt(qty) || 0) - 1))}
                  className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center hover:bg-white/10"
                  style={{ color: 'var(--hc-muted)' }}>−</button>
                <input
                  type="number" min={0} value={qty}
                  onChange={e => setQty(d.v, Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="w-14 text-center text-sm font-bold rounded-lg outline-none py-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
                />
                <button onClick={() => setQty(d.v, (Number.parseInt(qty) || 0) + 1)}
                  className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center hover:bg-white/10"
                  style={{ color: 'var(--hc-muted)' }}>+</button>
              </div>
              <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: sub > 0 ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
                {sub > 0 ? `₡${fmt(sub)}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: color ?? 'var(--hc-text)' }}>₡{fmt(value)}</p>
    </div>
  )
}

export default function AdminPOSCaja() {
  const { showToast } = useToast()
  const [turno, setTurno]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [montoDeclarado, setMontoDeclarado] = useState(0)
  const [notas, setNotas]     = useState('')
  const [cerrado, setCerrado] = useState(null)

  useEffect(() => {
    posService.getCajaActiva()
      .then(res => setTurno(res?.data ?? null))
      .catch(() => setTurno(null))
      .finally(() => setLoading(false))
  }, [])

  const handleCerrar = async () => {
    if (!turno) { showToast('No hay turno activo', 'error'); return }
    setSaving(true)
    try {
      const res = await posService.cerrarCaja(turno.id, { montoDeclarado, notas })
      setCerrado(res.data ?? res)
      setTurno(null)
      showToast('Turno cerrado correctamente', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al cerrar turno', 'error')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
      </div>
    )
  }

  /* ── Sin turno activo y ya cerrado ── */
  if (!turno && cerrado) {
    const diff = cerrado.diferencia ?? 0
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="rounded-3xl p-6 text-center space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl"
            style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}>
            ✓
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Turno cerrado</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: '#fff' }}>
              ₡{fmt(cerrado.montoDeclarado ?? 0)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>efectivo contado</p>
          </div>
          <div className="rounded-xl p-3 inline-block"
            style={{
              backgroundColor: diff === 0 ? 'rgba(52,211,153,0.08)' : diff > 0 ? 'rgba(251,191,36,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${diff === 0 ? 'rgba(52,211,153,0.2)' : diff > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Diferencia</p>
            <p className="text-lg font-black tabular-nums"
              style={{ color: diff === 0 ? '#34d399' : diff > 0 ? '#fbbf24' : '#f87171' }}>
              {diff >= 0 ? '+' : ''}₡{fmt(diff)}
              <span className="text-xs font-medium ml-1">
                {diff > 0 ? '(sobrante)' : diff < 0 ? '(faltante)' : '(exacto)'}
              </span>
            </p>
          </div>
        </div>
        <Link to="/admin/pos"
          className="block w-full py-4 rounded-2xl font-black text-center text-base"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>
          ← Volver al POS
        </Link>
      </div>
    )
  }

  /* ── Sin turno activo (nunca abrió) ── */
  if (!turno) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6 text-center">
        <div className="rounded-2xl p-8"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-bold" style={{ color: 'var(--hc-text)' }}>No hay turno activo</p>
          <p className="text-sm mt-2" style={{ color: 'var(--hc-muted)' }}>
            Abrí el turno desde el POS antes de hacer el cuadre
          </p>
        </div>
        <Link to="/admin/pos"
          className="block w-full py-4 rounded-2xl font-black text-center text-base"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>
          Ir al POS → abrir turno
        </Link>
      </div>
    )
  }

  /* ── Turno activo — cuadre de cierre ── */
  const esperado = (turno.montoInicial ?? 0) + (turno.totalEfectivo ?? 0)
  const diff = montoDeclarado > 0 ? montoDeclarado - esperado : null

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/pos" className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>← Volver al POS</Link>
          <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>Cuadre de caja</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Paso 3 de 3 — Cerrá el turno y contá el efectivo final
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium text-green-400"
          style={{ backgroundColor: 'rgba(52,211,153,0.12)' }}>
          Turno activo
        </span>
      </div>

      {/* KPIs del turno */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Efectivo cobrado"  value={turno.totalEfectivo}      color="#34d399"/>
        <StatBox label="SINPE"             value={turno.totalSinpe}          color="#6490EA"/>
        <StatBox label="Tarjeta"           value={turno.totalTarjeta}        color="#7aa3ff"/>
        <StatBox label="Transferencia"     value={turno.totalTransferencia}  color="#fbbf24"/>
      </div>

      <div className="rounded-xl px-4 py-3 flex justify-between items-center"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Ventas del turno</p>
          <p className="text-2xl font-black" style={{ color: 'var(--hc-accent)' }}>{turno.numTransacciones ?? 0}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Efectivo inicial</p>
          <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>₡{fmt(turno.montoInicial)}</p>
        </div>
      </div>

      {/* Conteo final */}
      <div className="rounded-2xl p-5 space-y-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>Contá el efectivo físico actual</p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Incluye el inicial + lo cobrado en efectivo durante el turno
          </p>
        </div>

        <ConteoEfectivo label="Total contado en caja" onTotal={setMontoDeclarado} />

        {/* Diferencia */}
        {diff !== null && (
          <div className="rounded-xl p-3"
            style={{
              backgroundColor: diff === 0 ? 'rgba(52,211,153,0.06)' : diff > 0 ? 'rgba(251,191,36,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${diff === 0 ? 'rgba(52,211,153,0.2)' : diff > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Diferencia (contado − esperado)</p>
            <p className="font-black text-lg tabular-nums mt-0.5"
              style={{ color: diff === 0 ? '#34d399' : diff > 0 ? '#fbbf24' : '#f87171' }}>
              {diff >= 0 ? '+' : ''}₡{fmt(diff)}
              <span className="text-xs font-medium ml-1.5">
                {diff > 0 ? 'sobrante' : diff < 0 ? 'faltante' : 'cuadre exacto ✓'}
              </span>
            </p>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Notas del turno (opcional)</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            placeholder="Observaciones…"
            className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
        </div>

        <button onClick={handleCerrar} disabled={saving || montoDeclarado === 0}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: '#fff' }}>
          {saving ? 'Cerrando…' : montoDeclarado === 0 ? 'Contá el efectivo primero' : 'Cerrar turno'}
        </button>
      </div>
    </div>
  )
}
