import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import SuscripcionKpis from './suscripcion/SuscripcionKpis'
import SuscripcionAcciones from './suscripcion/SuscripcionAcciones'
import SuscripcionFacturas from './suscripcion/SuscripcionFacturas'
import type { FacturaBilling, SuscripcionInfo } from './suscripcion/suscripcionHelpers'

export default function AdminSuscripcion() {
  const [sub, setSub] = useState<SuscripcionInfo | null>(null)
  const [facturas, setFacturas] = useState<FacturaBilling[]>([])
  const [cargando, setCargando] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const { planNombre, loadTenantInfo } = useTenantStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    if (params.get('session_id') || params.get('mock') === 'success') {
      loadTenantInfo()
    }
  }, [params, loadTenantInfo])

  useEffect(() => {
    Promise.all([
      billingService.getSuscripcion(),
      billingService.getFacturas(),
    ]).then(([subRes, factRes]) => {
      setSub((subRes.data ?? null) as SuscripcionInfo | null)
      setFacturas(Array.isArray(factRes.data) ? factRes.data as FacturaBilling[] : [])
    }).catch((err: unknown) => {
      console.error('[AdminSuscripcion] cargar', err)
      setError('No se pudo cargar la información de suscripción')
    }).finally(() => setCargando(false))
  }, [])

  async function abrirPortal() {
    setAbriendo(true)
    try {
      const { data } = await billingService.crearPortal()
      const url = data && typeof data === 'object' && 'portalUrl' in data
        ? (data as { portalUrl?: unknown }).portalUrl
        : undefined
      if (typeof url === 'string' && url) globalThis.open(url, '_blank')
    } catch (err: unknown) {
      console.error('[AdminSuscripcion] portal', err)
      setError('No se pudo abrir el portal de pagos')
    } finally {
      setAbriendo(false)
    }
  }

  async function cancelarSuscripcion() {
    setCancelando(true)
    try {
      await billingService.cancelar(false)
      setSub(prev => prev ? { ...prev, cancelarAlVencer: true } : prev)
      setConfirmarCancelar(false)
    } catch (err: unknown) {
      console.error('[AdminSuscripcion] cancelar', err)
      setError('Error al cancelar la suscripción')
    } finally {
      setCancelando(false)
    }
  }

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
        <button type="button"
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

      <SuscripcionKpis planNombre={planNombre} estado={estado} esTrial={esTrial} sub={sub} />
      <SuscripcionAcciones
        esTrial={esTrial}
        tieneStripe={tieneStripe}
        sub={sub}
        estado={estado}
        confirmarCancelar={confirmarCancelar}
        cancelando={cancelando}
        abriendo={abriendo}
        onVerPlanes={() => navigate('/admin/billing/planes')}
        onAbrirPortal={abrirPortal}
        onPedirConfirmacion={() => setConfirmarCancelar(true)}
        onCancelarConfirmacion={() => setConfirmarCancelar(false)}
        onConfirmarCancelar={cancelarSuscripcion}
      />
      <SuscripcionFacturas facturas={facturas} />
    </div>
  )
}
