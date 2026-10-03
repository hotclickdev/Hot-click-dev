import { etiquetaPlan } from '@/prototipo/compartido/planesPageHelpers'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import useAuthStore from '@/store/authStore'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import AccesoTiendaPublica from '@/components/sistema/AccesoTiendaPublica'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CloseIcon from '@/components/ui/CloseIcon'
import OnvoSuscripcionEmbed from '@/features/billing/OnvoSuscripcionEmbed'
import { useCambiarPlan } from '@/features/billing/useCambiarPlan'
import AvisoBajadaBloqueada from '@/features/billing/AvisoBajadaBloqueada'
import { esBajada } from '@/features/billing/bajarPlanHelpers'
import type { Id } from '@/types/api'

type PlanSaas = {
  id: Id
  nombre: string
  precioUsd?: number | string
  precioMensual?: number
  comisionPorcentaje?: number | string
  descripcion?: string
  maxProductos?: number
  maxUsuarios?: number
  tienePos?: boolean
  tieneCrm?: boolean
  tieneCompras?: boolean
  tieneReportes?: boolean
  tieneAi?: boolean
  tieneApi?: boolean
  tieneGiftCards?: boolean
}

function listaPlanes(data: unknown): PlanSaas[] {
  return Array.isArray(data) ? data as PlanSaas[] : []
}

function Feature({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-[14px] ${ok ? 'text-hc-n-900' : 'text-hc-n-600'}`}>
      {ok
        ? <span className="shrink-0 text-hc-success"><TrustGlyph tipo="check" className="w-4 h-4" /></span>
        : <CloseIcon className="w-4 h-4 shrink-0" />}
      {label}
    </div>
  )
}

function PlanCard({ plan, planActual, esCurrent, loading, onSelect }: {
  plan: PlanSaas
  planActual: string
  esCurrent: boolean
  loading: boolean
  onSelect: (planId: Id) => void
}) {
  const esFree = plan.nombre === 'EMPRENDEDOR'
  const bajada = esBajada(planActual, plan.nombre)
  const nombre = etiquetaPlan(plan.nombre)

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-[14px] border bg-hc-n-0 p-5 text-hc-n-900 ${esCurrent ? 'border-hc-blue-600 bg-hc-blue-50 shadow-[0_1px_3px_rgba(20,23,28,.12)]' : 'border-hc-n-200'}`}
    >
      {esCurrent && (
        <span className="absolute right-3 top-3 rounded-full bg-hc-n-0 px-2 py-0.5 text-[11px] font-semibold text-hc-blue-600 ring-1 ring-hc-blue-100">
          Tu plan actual
        </span>
      )}

      <div>
        <p className="font-[family-name:var(--hc-font-display)] text-[17px] font-bold">{nombre}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-hc-n-600">
          Mensualidad y comisión:
          <span className="rounded-full bg-hc-n-100 px-2 py-0.5 text-[11px] font-semibold text-hc-n-600">[PENDIENTE]</span>
        </p>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <Feature ok label={plan.maxProductos === -1 ? 'Productos sin límite' : `Hasta ${plan.maxProductos} productos`} />
        <Feature ok label={plan.maxUsuarios === -1 ? 'Usuarios sin límite' : `Equipo de ${plan.maxUsuarios} usuario${(plan.maxUsuarios ?? 0) > 1 ? 's' : ''}`} />
        {/* El POS va en los tres planes (decisión 3-oct-2026): no depende de tienePos del API. */}
        <Feature ok label="Punto de venta" />
        <Feature ok label="Inventario y alertas de stock bajo" />
        <Feature ok label="Lista de clientes" />
        <Feature ok label="Reportes de ventas" />
        <Feature ok={plan.tieneCompras}  label="Compras a proveedores" />
        <Feature ok={plan.tieneGiftCards} label="Gift cards" />
        <Feature ok={plan.tieneAi}       label="Consultas de IA" />
        <Feature ok={plan.tieneApi}      label="API Keys / Webhooks" />
      </div>

      {!esCurrent && (
        <button type="button"
          onClick={() => onSelect(plan.id)}
          disabled={loading}
          className={`h-12 w-full rounded-[12px] text-[15px] font-semibold disabled:cursor-not-allowed disabled:bg-hc-n-200 disabled:text-hc-n-600 ${bajada || esFree ? 'border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50' : 'bg-hc-red-500 text-white hover:bg-hc-red-600'}`}
        >
          {loading ? 'Procesando…' : bajada ? `Bajar a ${nombre}` : `Mejorar a ${nombre}`}
        </button>
      )}
      {esCurrent && !esFree && (
        <div className="text-center text-[12px] text-hc-n-600">Plan activo</div>
      )}
    </div>
  )
}

export default function AdminPlanes() {
  const [planes, setPlanes] = useState<PlanSaas[]>([])
  const [cargando, setCargando] = useState(true)
  const { planNombre, estadoPlan, trialDias } = useTenantStore()
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const {
    loadingPlan,
    error,
    setError,
    pagoPendiente,
    bajadaBloqueada,
    seleccionarPlan,
    irAExito,
    cancelarPago,
  } = useCambiarPlan({ rutaExito: '/admin/billing/suscripcion' })

  function handleLogout() {
    logout()
    navigate('/')
  }

  useEffect(() => {
    billingService.getPlanes()
      .then(({ data }) => setPlanes(listaPlanes(data)))
      .catch(() => setError('No se pudieron cargar los planes'))
      .finally(() => setCargando(false))
  }, [setError])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--hc-font-display)] text-[24px] font-bold text-hc-n-900">Planes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Plan actual: <strong>{etiquetaPlan(planNombre)}</strong>
            {estadoPlan === 'TRIAL' && trialDias >= 0 && (
              <span className="ml-2 text-hc-warning">— trial ({trialDias} días restantes)</span>
            )}
          </p>
        </div>
        <button type="button"
          onClick={() => navigate('/admin/billing/suscripcion')}
          className="text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
          style={{ color: 'var(--hc-accent)', border: '1px solid var(--hc-accent)' }}
        >
          Ver suscripción
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-[12px] border border-hc-red-500 bg-hc-n-0 p-3 text-[13px] text-hc-n-900">
          {error}
        </div>
      )}

      {bajadaBloqueada && <AvisoBajadaBloqueada plan={bajadaBloqueada.plan} excesos={bajadaBloqueada.excesos} />}

      {pagoPendiente && (
        <div className="rounded-[14px] p-5 space-y-3" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
              Pagar plan {pagoPendiente.planNombre ?? ''}
            </p>
            <button type="button" onClick={cancelarPago} className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Cancelar
            </button>
          </div>
          <OnvoSuscripcionEmbed
            subscriptionId={pagoPendiente.subscriptionId}
            customerId={pagoPendiente.customerId}
            publishableKey={pagoPendiente.publishableKey}
            onSuccess={() => { void irAExito() }}
            onError={(msg) => setError(msg)}
          />
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planes.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              planActual={planNombre}
              esCurrent={plan.nombre === planNombre}
              loading={loadingPlan === plan.id}
              onSelect={(id) => { void seleccionarPlan(id, plan, etiquetaPlan(plan.nombre)) }}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>
        Los montos se confirman antes de pagar. Podés subir de plan cuando quieras; si bajás, el cambio aplica al final del período que ya pagaste. No borramos nada: vos elegís qué ajustar.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold pt-2">
        <EnlaceTiendaCliente />
        <button
          type="button"
          onClick={() => globalThis.dispatchEvent(new Event('hc-open-tour'))}
          className="hover:underline"
          style={{ color: 'var(--hc-muted)' }}
        >
          Tour del panel
        </button>
        <button type="button" onClick={handleLogout} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>
          Cerrá sesión
        </button>
      </div>
    </div>
  )
}

function EnlaceTiendaCliente() {
  const userRole = useAuthStore((s) => s.userRole)
  if (esUsuarioSistema(userRole)) {
    return <AccesoTiendaPublica variante="muted" conCopiar={false} />
  }
  return (
    <Link to="/" className="hover:underline" style={{ color: 'var(--hc-muted)' }}>
      Ver tienda como cliente
    </Link>
  )
}
