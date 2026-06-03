import { useState, useEffect } from 'react'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

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

  const [turno, setTurno]                   = useState(null)
  const [loading, setLoading]               = useState(true)
  const [montoInicial, setMontoInicial]     = useState('')
  const [montoDeclarado, setMontoDeclarado] = useState('')
  const [notas, setNotas]                   = useState('')
  const [saving, setSaving]                 = useState(false)

  useEffect(() => {
    posService.getCajaActiva()
      .then(res => setTurno(res?.data ?? null))
      .catch(() => setTurno(null))
      .finally(() => setLoading(false))
  }, [])

  const handleAbrir = async () => {
    setSaving(true)
    try {
      const res = await posService.abrirCaja({
        montoInicial: parseInt(montoInicial.replace(/\D/g, '') || '0'),
      })
      setTurno(res.data)
      showToast('Turno abierto correctamente', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al abrir turno', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCerrar = async () => {
    if (!turno) { showToast('No hay un turno abierto para cerrar', 'error'); return }
    setSaving(true)
    try {
      const res = await posService.cerrarCaja(turno.id, {
        montoDeclarado: parseInt(montoDeclarado.replace(/\D/g, '') || '0'),
        notas,
      })
      setTurno(null)
      showToast('Turno cerrado. Diferencia: ₡' + fmt(res.data?.diferencia ?? 0), 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al cerrar turno', 'error')
    } finally {
      setSaving(false)
    }
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

      {/* Sin turno — apertura */}
      {!turno && (
        <div className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>Abrir turno</h2>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
              Monto inicial en caja (₡)
            </label>
            <input
              type="text"
              value={montoInicial}
              onChange={e => setMontoInicial(e.target.value)}
              placeholder="0"
              className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
            />
          </div>
          <button onClick={handleAbrir} disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? 'Abriendo…' : 'Abrir turno'}
          </button>
        </div>
      )}

      {/* Con turno — resumen + cierre */}
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

          <div className="rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>Cerrar turno</h2>

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
                Monto contado físicamente (₡)
              </label>
              <input
                type="text"
                value={montoDeclarado}
                onChange={e => setMontoDeclarado(e.target.value)}
                placeholder="0"
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
              />
            </div>

            {/* Diferencia estimada */}
            {montoDeclarado && (
              <div className="rounded-lg p-3 text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Diferencia estimada</p>
                {(() => {
                  const esperado = turno.montoInicial + turno.totalEfectivo
                  const declarado = parseInt(montoDeclarado.replace(/\D/g, '') || '0')
                  const diff = declarado - esperado
                  return (
                    <p className={`font-bold text-base ${diff === 0 ? '' : diff > 0 ? '' : ''}`}
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
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={2}
                placeholder="Observaciones del turno…"
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
              />
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
