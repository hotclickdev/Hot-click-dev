import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { billingService } from '@/services/billingService'
import { mensajeErrorPlan } from '@/features/billing/useCambiarPlan'
import { accionCompletarPago, nombrePlanVisible, planPorCompletar, type PagoDesdeAviso } from './planPendiente'

const PagoPlanEmbed = lazy(() => import('@/features/billing/PagoPlanEmbed'))

/**
 * Plan nuevo elegido sin pagar. ALTO-02b: «Completar pago» pide al backend el cobro pendiente de la suscripción ONVO
 * y abre el SDK sobre ella (primera factura o método de pago). No pasa por el asistente ni por /cambiar-plan.
 * Si no hay nada que cobrar en ONVO, lleva a la pantalla de planes.
 */
export default function PlanPendienteBanner({ rutaPlan }: { rutaPlan: string }) {
  const navigate = useNavigate()
  const [plan, setPlan] = useState<string | null>(null)
  const [pago, setPago] = useState<PagoDesdeAviso | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagado, setPagado] = useState(false)

  useEffect(() => {
    let vivo = true
    api.get('/billing/plan-pendiente')
      .then(({ data }) => { if (vivo) setPlan(planPorCompletar(data)) })
      .catch(() => { /* sin aviso */ })
    return () => { vivo = false }
  }, [])

  const completarPago = async () => {
    if (cargando) return
    setCargando(true)
    setError(null)
    try {
      const { data } = await billingService.completarPago()
      const accion = accionCompletarPago(data)
      if (accion.tipo === 'pagar') setPago(accion.pago)
      else navigate(rutaPlan)
    } catch (err) {
      setError(mensajeErrorPlan(err, 'No pudimos abrir el pago. Probá de nuevo en unos minutos.'))
    } finally {
      setCargando(false)
    }
  }

  if (!plan) return null
  return (
    <div
      className="w-full px-4 py-2.5 flex flex-col items-center gap-2 text-sm text-center"
      style={{ background: 'var(--hc-warning-bg, #FDF3DC)', color: 'var(--hc-warning, #9A6700)', borderBottom: '1px solid var(--hc-border)' }}
      role="status"
    >
      {pagado ? (
        <span>Recibimos tu pago. El plan {nombrePlanVisible(plan)} se activa apenas ONVO lo confirme.</span>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>Elegiste el plan {nombrePlanVisible(plan)} y falta el pago.</span>
          {!pago && (
            <button type="button" onClick={completarPago} disabled={cargando} className="font-semibold underline">
              {cargando ? 'Abriendo pago…' : 'Completar pago'}
            </button>
          )}
        </div>
      )}
      {error && <span role="alert">{error}</span>}
      {pago && !pagado && (
        <div className="w-full max-w-md text-left">
          <Suspense fallback={<span>Cargando pago…</span>}>
            <PagoPlanEmbed pago={pago} onPagado={() => { setPagado(true); setPago(null) }} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
