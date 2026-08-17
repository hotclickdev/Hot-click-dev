import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import ConteoEfectivo from './ConteoEfectivo'
import StatBox from './StatBox'
import { formatMontoPos } from './posHelpers'
import { CheckIcon, TransferenciaIcon } from './posIcons'

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
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
            <CheckIcon />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Turno cerrado</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: '#fff' }}>
              ₡{formatMontoPos(cerrado.montoDeclarado ?? 0)}
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
              {diff >= 0 ? '+' : ''}₡{formatMontoPos(diff)}
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
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ color: 'var(--hc-muted)' }}>
            <TransferenciaIcon className="w-10 h-10" />
          </div>
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
          <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>₡{formatMontoPos(turno.montoInicial)}</p>
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

        <ConteoEfectivo label="Total contado en caja" onTotal={setMontoDeclarado} totalColor="var(--hc-accent)" />

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
              {diff >= 0 ? '+' : ''}₡{formatMontoPos(diff)}
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

        <button type="button" onClick={handleCerrar} disabled={saving || montoDeclarado === 0}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: '#fff' }}>
          {saving ? 'Cerrando…' : montoDeclarado === 0 ? 'Contá el efectivo primero' : 'Cerrar turno'}
        </button>
      </div>
    </div>
  )
}
