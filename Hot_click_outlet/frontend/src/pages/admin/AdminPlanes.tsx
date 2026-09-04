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
}

function listaPlanes(data: unknown): PlanSaas[] {
  return Array.isArray(data) ? data as PlanSaas[] : []
}

function etiquetaComision(plan: PlanSaas): string {
  const pct = Number(plan.comisionPorcentaje ?? 0)
  const base = Number.isFinite(pct) && pct > 0 ? `${pct}% por venta` : 'Sin comisión por venta'
  if (plan.nombre === 'EMPRENDEDOR') return `${base} (mín. ₡400)`
  return base
}

function Feature({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: ok ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
      {ok
        ? <span className="shrink-0" style={{ color: '#22c55e' }}><TrustGlyph tipo="check" className="w-4 h-4" /></span>
        : <CloseIcon className="w-4 h-4 shrink-0" />}
      {label}
    </div>
  )
}

function PlanCard({ plan, esCurrent, loading, onSelect }: {
  plan: PlanSaas
  esCurrent: boolean
  loading: boolean
  onSelect: (planId: Id) => void
}) {
  const esEnterprise = plan.nombre === 'NEGOCIO_PLUS'
  const esFree = plan.nombre === 'EMPRENDEDOR'
  const precioCrc = Number(plan.precioMensual ?? 0)

  return (
    <div
      className="relative flex flex-col rounded-2xl p-6 gap-4"
      style={{
        backgroundColor: esEnterprise ? 'var(--hc-accent)' : 'var(--hc-surface)',
        border: esCurrent
          ? '2px solid var(--hc-accent)'
          : esEnterprise ? 'none' : '1px solid var(--hc-border)',
        color: esEnterprise ? '#fff' : 'var(--hc-text)',
      }}
    >
      {esCurrent && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          Plan actual
        </span>
      )}
      {esEnterprise && !esCurrent && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
          Popular
        </span>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{plan.nombre}</p>
        <div className="flex items-end gap-1 mt-1">
          <span className="text-3xl font-bold">
            {precioCrc === 0 ? 'Gratis' : `₡${precioCrc.toLocaleString('es-CR')}`}
          </span>
          {precioCrc > 0 && (
            <span className="text-sm opacity-60 mb-1">/mes</span>
          )}
        </div>
        <p className="text-xs mt-1 opacity-60">{plan.descripcion}</p>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <Feature ok label={etiquetaComision(plan)} />
        <Feature ok label={`${plan.maxProductos === -1 ? 'Ilimitados' : plan.maxProductos} productos`} />
        <Feature ok label={`${plan.maxUsuarios} usuario${(plan.maxUsuarios ?? 0) > 1 ? 's' : ''}`} />
        <Feature ok={plan.tienePos} label="POS / Caja registradora" />
        <Feature ok={plan.tieneCrm} label="CRM / Clientes" />
        <Feature ok={plan.tieneCompras}  label="Módulo de compras" />
        <Feature ok={plan.tieneReportes} label="Reportes avanzados" />
        <Feature ok={plan.tieneAi}       label="Consultas con Hot" />
        <Feature ok={plan.tieneApi}      label="API Keys / Webhooks" />
      </div>

      {!esCurrent && (
        <button type="button"
          onClick={() => onSelect(plan.id)}
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: esEnterprise ? 'transparent' : 'var(--hc-accent)',
            color: esEnterprise ? 'var(--hc-accent)' : '#fff',
            border: esEnterprise ? '2px solid var(--hc-accent)' : 'none',
          }}
        >
          {loading ? 'Procesando…' : esFree ? `Bajar a ${plan.nombre}` : `Cambiar a ${plan.nombre}`}
        </button>
      )}
      {esCurrent && !esFree && (
        <div className="text-center text-xs opacity-60">Plan activo</div>
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Planes y precios</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Plan actual: <strong>{planNombre}</strong>
            {estadoPlan === 'TRIAL' && trialDias >= 0 && (
              <span className="ml-2 text-yellow-400">— trial ({trialDias} días restantes)</span>
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
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {pagoPendiente && (
        <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
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
              esCurrent={plan.nombre === planNombre}
              loading={loadingPlan === plan.id}
              onSelect={(id) => { void seleccionarPlan(id) }}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>
        Los precios están en colones (CRC). El cobro mensual se procesa con ONVO.
        Podés cancelar en cualquier momento desde la sección de suscripción.
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
