import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'

const CHECK = (
  <svg className="w-4 h-4 shrink-0" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)
const X = (
  <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

function Feature({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: ok ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
      {ok ? CHECK : X}
      {label}
    </div>
  )
}

function PlanCard({ plan, esCurrent, loading, onSelect }) {
  const esEnterprise = plan.nombre === 'NEGOCIO_PLUS'
  const esFree = plan.nombre === 'EMPRENDEDOR'

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
      {esEnterprise && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
          Popular
        </span>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{plan.nombre}</p>
        <div className="flex items-end gap-1 mt-1">
          <span className="text-3xl font-bold">
            {Number(plan.precioUsd) === 0 ? 'Gratis' : `$${Number(plan.precioUsd).toFixed(2)}`}
          </span>
          {Number(plan.precioUsd) > 0 && (
            <span className="text-sm opacity-60 mb-1">/mes</span>
          )}
        </div>
        <p className="text-xs mt-1 opacity-60">{plan.descripcion}</p>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <Feature ok label={`${plan.maxProductos === -1 ? 'Ilimitados' : plan.maxProductos} productos`} />
        <Feature ok label={`${plan.maxUsuarios} usuario${plan.maxUsuarios > 1 ? 's' : ''}`} />
        <Feature ok={plan.tienePos}      label="POS / Caja registradora" />
        <Feature ok={plan.tieneCrm}      label="CRM / Clientes" />
        <Feature ok={plan.tieneCompras}  label="Módulo de compras" />
        <Feature ok={plan.tieneReportes} label="Reportes avanzados" />
        <Feature ok={plan.tieneAi}       label="AI Copilot" />
        <Feature ok={plan.tieneApi}      label="API Keys / Webhooks" />
      </div>

      {!esCurrent && !esFree && (
        <button
          onClick={() => onSelect(plan.id)}
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: esEnterprise ? 'transparent' : 'var(--hc-accent)',
            color: esEnterprise ? 'var(--hc-accent)' : '#fff',
            border: esEnterprise ? '2px solid var(--hc-accent)' : 'none',
          }}
        >
          {loading ? 'Redirigiendo…' : `Suscribirse al ${plan.nombre}`}
        </button>
      )}
      {esCurrent && !esFree && (
        <div className="text-center text-xs opacity-60">Plan activo</div>
      )}
    </div>
  )
}

export default function AdminPlanes() {
  const [planes, setPlanes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)
  const { planNombre, estadoPlan, trialDias } = useTenantStore()
  const navigate = useNavigate()

  useEffect(() => {
    billingService.getPlanes()
      .then(({ data }) => setPlanes(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudieron cargar los planes'))
      .finally(() => setCargando(false))
  }, [])

  async function seleccionarPlan(planId) {
    setLoadingPlan(planId)
    setError(null)
    try {
      const { data } = await billingService.crearCheckout(planId)
      if (data.checkoutUrl) {
        globalThis.location.href = data.checkoutUrl
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Error al iniciar el pago')
      setLoadingPlan(null)
    }
  }

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
        <button
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
              onSelect={seleccionarPlan}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>
        Los precios están en USD. El cobro se procesa mensualmente mediante Stripe.
        Podés cancelar en cualquier momento desde la sección de suscripción.
      </p>
    </div>
  )
}
