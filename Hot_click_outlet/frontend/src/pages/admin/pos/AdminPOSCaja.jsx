import { useState, useEffect } from 'react'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

// Denominaciones costarricenses con colores de referencia
const BILLETES = [
  { valor: 50000, label: '₡50.000', color: '#c0392b', bg: 'rgba(192,57,43,0.15)', texto: 'Rojo' },
  { valor: 20000, label: '₡20.000', color: '#27ae60', bg: 'rgba(39,174,96,0.15)',  texto: 'Verde' },
  { valor: 10000, label: '₡10.000', color: '#e67e22', bg: 'rgba(230,126,34,0.15)', texto: 'Naranja' },
  { valor:  5000, label: '₡5.000',  color: '#2980b9', bg: 'rgba(41,128,185,0.15)', texto: 'Azul' },
  { valor:  2000, label: '₡2.000',  color: '#8e44ad', bg: 'rgba(142,68,173,0.15)', texto: 'Morado' },
  { valor:  1000, label: '₡1.000',  color: '#795548', bg: 'rgba(121,85,72,0.15)',  texto: 'Café' },
]

const MONEDAS = [
  { valor: 500, label: '₡500', color: '#9e9e9e', bg: 'rgba(158,158,158,0.15)', texto: 'Plateada' },
  { valor: 100, label: '₡100', color: '#ffc107', bg: 'rgba(255,193,7,0.15)',   texto: 'Dorada' },
  { valor:  50, label: '₡50',  color: '#ffc107', bg: 'rgba(255,193,7,0.12)',   texto: 'Dorada' },
  { valor:  25, label: '₡25',  color: '#ffc107', bg: 'rgba(255,193,7,0.09)',   texto: 'Dorada ch.' },
  { valor:  10, label: '₡10',  color: '#bf8040', bg: 'rgba(191,128,64,0.15)',  texto: 'Cobre' },
  { valor:   5, label: '₡5',   color: '#bf8040', bg: 'rgba(191,128,64,0.12)',  texto: 'Cobre ch.' },
]

function DenominacionRow({ item, qty, onChange, tipo }) {
  const subtotal = (parseInt(qty) || 0) * item.valor
  return (
    <div className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="w-20 shrink-0 px-2.5 py-1.5 rounded-lg text-center font-bold text-xs"
        style={{ backgroundColor: item.bg, color: item.color, border: `1px solid ${item.color}40` }}>
        {item.label}
      </div>
      <span className="text-[11px] text-[#8e8e9a] w-14 shrink-0">{item.texto}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onChange(Math.max(0, (parseInt(qty) || 0) - 1))}
          className="w-6 h-6 rounded font-bold text-sm flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>−</button>
        <input
          type="number" min={0} value={qty}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-14 text-center text-sm rounded-lg outline-none py-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
        />
        <button onClick={() => onChange((parseInt(qty) || 0) + 1)}
          className="w-6 h-6 rounded font-bold text-sm flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>+</button>
      </div>
      <span className="ml-auto text-xs font-semibold" style={{ color: subtotal > 0 ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
        {subtotal > 0 ? `₡${fmt(subtotal)}` : '—'}
      </span>
    </div>
  )
}

function ConteoEfectivo({ label, onTotal }) {
  const initQtys = () => {
    const obj = {}
    ;[...BILLETES, ...MONEDAS].forEach(d => { obj[d.valor] = '' })
    return obj
  }
  const [qtys, setQtys] = useState(initQtys)

  const total = [...BILLETES, ...MONEDAS].reduce((s, d) => s + (parseInt(qtys[d.valor]) || 0) * d.valor, 0)

  const setQty = (valor, v) => setQtys(p => {
    const next = { ...p, [valor]: v }
    const t = [...BILLETES, ...MONEDAS].reduce((s, d) => s + (parseInt(next[d.valor]) || 0) * d.valor, 0)
    onTotal(t)
    return next
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{label}</p>
        <span className="text-base font-black" style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</span>
      </div>

      <div className="rounded-xl p-3 space-y-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--hc-muted)' }}>Billetes</p>
        {BILLETES.map(d => (
          <DenominacionRow key={d.valor} item={d} qty={qtys[d.valor]} onChange={v => setQty(d.valor, v)} />
        ))}
        <p className="text-[11px] font-semibold uppercase tracking-wider mt-3 mb-2" style={{ color: 'var(--hc-muted)' }}>Monedas</p>
        {MONEDAS.map(d => (
          <DenominacionRow key={d.valor} item={d} qty={qtys[d.valor]} onChange={v => setQty(d.valor, v)} />
        ))}
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
  const [montoInicial, setMontoInicial]     = useState(0)
  const [montoDeclarado, setMontoDeclarado] = useState(0)
  const [notas, setNotas]                   = useState('')

  useEffect(() => {
    posService.getCajaActiva()
      .then(res => setTurno(res?.data ?? null))
      .catch(() => setTurno(null))
      .finally(() => setLoading(false))
  }, [])

  const handleAbrir = async () => {
    setSaving(true)
    try {
      const res = await posService.abrirCaja({ montoInicial })
      setTurno(res.data)
      showToast('Turno abierto correctamente', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al abrir turno', 'error')
    } finally { setSaving(false) }
  }

  const handleCerrar = async () => {
    if (!turno) { showToast('No hay turno activo', 'error'); return }
    setSaving(true)
    try {
      const res = await posService.cerrarCaja(turno.id, { montoDeclarado, notas })
      setTurno(null)
      showToast('Turno cerrado. Diferencia: ₡' + fmt(res.data?.diferencia ?? 0), 'success')
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

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Cuadre de caja</h1>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${turno ? 'text-green-400' : 'text-yellow-400'}`}
          style={{ backgroundColor: turno ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)' }}>
          {turno ? 'Turno abierto' : 'Sin turno activo'}
        </span>
      </div>

      {!turno && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>Abrir turno — contá el efectivo inicial</h2>
          <ConteoEfectivo label="Efectivo en caja al inicio" onTotal={setMontoInicial} />
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>Total inicial:</span>
            <span className="text-xl font-black" style={{ color: '#34d399' }}>₡{fmt(montoInicial)}</span>
          </div>
          <button onClick={handleAbrir} disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? 'Abriendo…' : 'Abrir turno'}
          </button>
        </div>
      )}

      {turno && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Efectivo"      value={turno.totalEfectivo}      color="#34d399"/>
            <StatBox label="SINPE"         value={turno.totalSinpe}         color="#60a5fa"/>
            <StatBox label="Tarjeta"       value={turno.totalTarjeta}       color="#a78bfa"/>
            <StatBox label="Transferencia" value={turno.totalTransferencia} color="#fbbf24"/>
          </div>

          <div className="rounded-xl p-4 flex justify-between items-center"
            style={{ backgroundColor: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.2)' }}>
            <div>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Transacciones</p>
              <p className="text-2xl font-black" style={{ color: 'var(--hc-accent)' }}>{turno.numTransacciones}</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Monto inicial</p>
              <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>₡{fmt(turno.montoInicial)}</p>
            </div>
          </div>

          <div className="rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>Cerrar turno — contá el efectivo final</h2>
            <ConteoEfectivo label="Efectivo físico contado" onTotal={setMontoDeclarado} />

            {montoDeclarado > 0 && (
              <div className="rounded-lg p-3 text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Diferencia estimada</p>
                {(() => {
                  const esperado = turno.montoInicial + turno.totalEfectivo
                  const diff = montoDeclarado - esperado
                  return (
                    <p className="font-bold text-base"
                      style={{ color: diff === 0 ? '#34d399' : diff > 0 ? '#fbbf24' : '#f87171' }}>
                      {diff >= 0 ? '+' : ''}₡{fmt(diff)}
                      {diff > 0 ? ' (sobrante)' : diff < 0 ? ' (faltante)' : ' (cuadre exacto)'}
                    </p>
                  )
                })()}
              </div>
            )}

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                placeholder="Observaciones del turno…"
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
            </div>

            <button onClick={handleCerrar} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: '#fff' }}>
              {saving ? 'Cerrando…' : 'Cerrar turno'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
