import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { billingService } from '@/services/billingService'
import { mensajeErrorPlan } from '@/features/billing/useCambiarPlan'
import { sondearActivacion } from '@/features/billing/activacionPago'
import {
  accionCompletarPago, avisoPlanPendiente, fechaVisible, MSG_PAGO_EN_PROCESO, nombrePlanVisible,
  type AvisoPlanPendiente, type PagoDesdeAviso,
} from './planPendiente'

const PagoPlanEmbed = lazy(() => import('@/features/billing/PagoPlanEmbed'))

/**
 * Plan nuevo elegido sin pagar. ALTO-02b: «Completar pago» pide al backend el cobro pendiente de la suscripción ONVO
 * y abre el SDK sobre ella. MEDIO-3: al volver del SDK se reconcilia con ONVO; si confirma, el aviso se refresca y
 * desaparece sin recargar; si no, «pago en proceso». Trial con método de pago guardado: no falta pago, se muestra el
 * plan y la fecha del primer cobro.
 */
export default function PlanPendienteBanner({ rutaPlan }: { rutaPlan: string }) {
  const navigate = useNavigate()
  const [aviso, setAviso] = useState<AvisoPlanPendiente | null>(null)
  const [pago, setPago] = useState<PagoDesdeAviso | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enProceso, setEnProceso] = useState(false)

  const refrescar = useCallback(async () => {
    const { data } = await api.get('/billing/plan-pendiente')
    setAviso(avisoPlanPendiente(data))
  }, [])

  useEffect(() => {
    let vivo = true
    api.get('/billing/plan-pendiente')
      .then(({ data }) => { if (vivo) setAviso(avisoPlanPendiente(data)) })
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

  const volverDelPago = async () => {
    setPago(null)
    setEnProceso(false)
    const r = await sondearActivacion(() => billingService.reconciliarPago())
    try {
      await refrescar()
      setEnProceso(r !== 'activo')
    } catch {
      setEnProceso(true)
    }
  }

  if (!aviso) return null
  const plan = nombrePlanVisible(aviso.plan)
  return (
    <div
      className="w-full px-4 py-2.5 flex flex-col items-center gap-2 text-sm text-center"
      style={{ background: 'var(--hc-warning-bg, #FDF3DC)', color: 'var(--hc-warning, #9A6700)', borderBottom: '1px solid var(--hc-border)' }}
      role="status"
    >
      {aviso.tipo === 'trial_con_metodo' ? (
        <span>Elegiste el plan {plan}. Tu primer cobro es el {fechaVisible(aviso.primerCobro)}, al terminar la prueba.</span>
      ) : enProceso ? (
        <span>{MSG_PAGO_EN_PROCESO}</span>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>Elegiste el plan {plan} y falta el pago.</span>
          {!pago && (
            <button type="button" onClick={completarPago} disabled={cargando} className="font-semibold underline">
              {cargando ? 'Abriendo pago…' : 'Completar pago'}
            </button>
          )}
        </div>
      )}
      {error && <span role="alert">{error}</span>}
      {pago && aviso.tipo === 'falta_pago' && (
        <div className="w-full max-w-md text-left">
          <Suspense fallback={<span>Cargando pago…</span>}>
            <PagoPlanEmbed pago={pago} onPagado={() => { void volverDelPago() }} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
