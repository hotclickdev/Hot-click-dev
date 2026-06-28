import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'

const ESTADO_LABEL = {
  TRIAL:    { label: 'Trial activo',   color: '#fbbf24' },
  ACTIVO:   { label: 'Activo',         color: '#22c55e' },
  PAST_DUE: { label: 'Pago pendiente', color: '#f87171' },
  VENCIDO:  { label: 'Vencido',        color: '#9ca3af' },
  CANCELADO:{ label: 'Cancelado',      color: '#9ca3af' },
  SIN_SUSCRIPCION: { label: 'Sin suscripción', color: '#9ca3af' },
}

function EstadoBadge({ estado }) {
  const { label, color } = ESTADO_LABEL[estado] ?? { label: estado, color: '#9ca3af' }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  )
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </div>
  )
}

export default function AdminSuscripcion() {
  const [sub, setSub] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const { planNombre, loadTenantInfo } = useTenantStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    // session_id en URL = checkout completado, recargar info del tenant
    if (params.get('session_id') || params.get('mock') === 'success') {
      loadTenantInfo()
    }
  }, [params, loadTenantInfo])

  useEffect(() => {
    Promise.all([
      billingService.getSuscripcion(),
      billingService.getFacturas(),
    ]).then(([subRes, factRes]) => {
      setSub(subRes.data)
      setFacturas(Array.isArray(factRes.data) ? factRes.data : [])
    }).catch(() => setError('No se pudo cargar la información de suscripción'))
    .finally(() => setCargando(false))
  }, [])

  async function abrirPortal() {
    setAbriendo(true)
    try {
      const { data } = await billingService.crearPortal()
      if (data.portalUrl) globalThis.open(data.portalUrl, '_blank')
    } catch {
      setError('No se pudo abrir el portal de pagos')
    } finally {
      setAbriendo(false) }
  }

  async function cancelarSuscripcion() {
    setCancelando(true)
    try {
      await billingService.cancelar(false)
      setSub(prev => prev ? { ...prev, cancelarAlVencer: true } : prev)
      setConfirmarCancelar(false)
    } catch {
      setError('Error al cancelar la suscripción')
    } finally {
      setCancelando(false)
    }
  }

  const fmt = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const fmtMonto = (centavos, moneda) =>
    `${moneda?.toUpperCase() === 'USD' ? 'US$' : moneda} ${(centavos / 100).toFixed(2)}`

  if (cargando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
      </div>
    )
  }

  const estado = sub?.estado ?? 'SIN_SUSCRIPCION'
  const esTrial = estado === 'TRIAL'
  const tieneStripe = sub?.tieneStripe

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi suscripción</h1>
        <button
          onClick={() => navigate('/admin/billing/planes')}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          Ver planes
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard label="Plan" value={planNombre} />
        <KpiCard
          label="Estado"
          value={<EstadoBadge estado={estado} />}
        />
        {esTrial
          ? <KpiCard label="Trial vence" value={fmt(sub?.trialEnd)} />
          : <KpiCard label="Próxima renovación" value={fmt(sub?.fechaFin)}
              sub={sub?.cancelarAlVencer ? 'Se cancela al vencer' : undefined} />
        }
      </div>

      {/* Acciones */}
      <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Acciones</p>

        {esTrial && (
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--hc-border)' }}>
            <div>
              <p className="text-sm" style={{ color: 'var(--hc-text)' }}>Activar suscripción</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Elige un plan y paga con tarjeta</p>
            </div>
            <button
              onClick={() => navigate('/admin/billing/planes')}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
            >
              Elegir plan
            </button>
          </div>
        )}

        {tieneStripe && (
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--hc-border)' }}>
            <div>
              <p className="text-sm" style={{ color: 'var(--hc-text)' }}>Portal de facturación</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Actualizar tarjeta, descargar facturas</p>
            </div>
            <button
              onClick={abrirPortal}
              disabled={abriendo}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            >
              {abriendo ? 'Abriendo…' : 'Abrir portal'}
            </button>
          </div>
        )}

        {tieneStripe && !sub?.cancelarAlVencer && estado === 'ACTIVO' && (
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm" style={{ color: 'var(--hc-text)' }}>Cancelar suscripción</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Se mantiene activa hasta el fin del período</p>
            </div>
            {confirmarCancelar ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmarCancelar(false)}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
                >
                  No
                </button>
                <button
                  onClick={cancelarSuscripcion}
                  disabled={cancelando}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                >
                  {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmarCancelar(true)}
                className="px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-80"
                style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Cancelar plan
              </button>
            )}
          </div>
        )}

        {sub?.cancelarAlVencer && (
          <div className="py-2 text-sm" style={{ color: '#fbbf24' }}>
            La suscripción se cancelará al vencer el período ({fmt(sub?.fechaFin)}).
          </div>
        )}
      </div>

      {/* Historial de facturas */}
      {facturas.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="px-5 py-3 border-b" style={{ backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Historial de facturas</p>
          </div>
          <div className="divide-y" style={{ divideColor: 'var(--hc-border)' }}>
            {facturas.map(f => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
                    {fmt(f.periodoInicio)} – {fmt(f.periodoFin)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {fmtMonto(f.montoCentavos, f.moneda)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: f.estado === 'PAGADO' ? '#16a34a22' : '#f8717122',
                      color: f.estado === 'PAGADO' ? '#22c55e' : '#f87171',
                    }}>
                    {f.estado === 'PAGADO' ? 'Pagado' : f.estado}
                  </span>
                  {f.urlPdf && (
                    <a href={f.urlPdf} target="_blank" rel="noreferrer"
                      className="text-xs" style={{ color: 'var(--hc-accent)' }}>
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
