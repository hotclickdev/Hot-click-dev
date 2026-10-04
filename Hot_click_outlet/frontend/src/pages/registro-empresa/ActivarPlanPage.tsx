import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import useAuthStore from '@/store/authStore'
import { billingService } from '@/services/billingService'
import { useCambiarPlan } from '@/features/billing/useCambiarPlan'
import OnvoSuscripcionEmbed from '@/features/billing/OnvoSuscripcionEmbed'
import EmprendimientoPasoVerificar from '@/pages/auth/emprendimiento/EmprendimientoPasoVerificar'
import { useVerificarCorreoOtp } from '@/hooks/useVerificarCorreoOtp'
import { RUTA_PANEL_VENDEDOR } from '@/utils/destinoVender'
import { leerPlanQuery, planIdToNombreBackend } from './planQueryParam'
import type { Id } from '@/types/api'
import { planAlta, textoPagarDespues } from './altaVendedorPlanes'
import { AltaHeader, AltaPasos, AltaTitulo, PillPendiente } from './AltaVendedorUI'

type PlanApi = { id: Id; nombre: string }

export default function ActivarPlanPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const planQuery = leerPlanQuery(searchParams.toString())
  const plan = planAlta(planQuery)
  const correoVerificado = useAuthStore((s) => s.correoVerificado)
  const userEmail = useAuthStore((s) => s.userEmail)
  const token = useAuthStore((s) => s.token)

  const otp = useVerificarCorreoOtp(userEmail ?? '')
  const puedeActivar = correoVerificado || otp.verificado

  const [planId, setPlanId] = useState<Id | null>(null)
  const [buscandoPlan, setBuscandoPlan] = useState(true)
  const [errorPlan, setErrorPlan] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [carga, setCarga] = useState(0)

  const {
    loadingPlan, error: errorCobro, pagoPendiente,
    seleccionarPlan, irAExito, cancelarPago,
  } = useCambiarPlan({ rutaExito: RUTA_PANEL_VENDEDOR })

  useEffect(() => {
    if (!planQuery) return
    let activo = true
    billingService.getPlanes()
      .then(({ data }) => {
        if (!activo) return
        const planes = Array.isArray(data) ? (data as PlanApi[]) : []
        const nombreBuscado = planIdToNombreBackend(planQuery)
        const encontrado = planes.find((p) => p.nombre === nombreBuscado)
        if (encontrado) setPlanId(encontrado.id)
        else setErrorPlan('No se encontró el plan seleccionado')
      })
      .catch(() => { if (activo) setErrorPlan('No se pudieron cargar los planes') })
      .finally(() => { if (activo) setBuscandoPlan(false) })
    return () => { activo = false }
  }, [planQuery, carga])

  useEffect(() => {
    if (!puedeActivar || !planId || intentado) return
    setIntentado(true)
    void seleccionarPlan(planId)
  }, [puedeActivar, planId, intentado, seleccionarPlan])

  if (!token) return <Navigate to="/registro-empresa" replace />
  if (!planQuery) return <Navigate to="/registro-empresa" replace />

  return (
    <div className="min-h-screen bg-hc-n-50 font-[family-name:var(--hc-font-text)] text-hc-n-900">
      <AltaHeader derecha={null} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 pb-36 pt-5 lg:pt-8">
        <AltaPasos paso={2} />
        <AltaTitulo
          antes={pagoPendiente ? 'Activá tu plan' : 'Revisá tu'}
          acento={pagoPendiente ? plan.nombre : 'correo'}
          sub={pagoPendiente ? 'Confirmá el pago para activar tu suscripción.' : 'Te mandamos un código para confirmar que el correo es tuyo.'}
        />
        <div className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-hc-n-900">Plan {plan.nombre}</p>
            <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-hc-n-600">Mensualidad y comisión: <PillPendiente /></p>
          </div>
        </div>
        <div className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 lg:p-5">
          <div>
            <AnimatePresence mode="wait">
              {!puedeActivar ? (
                <EmprendimientoPasoVerificar
                  key="otp"
                  correoReg={userEmail ?? ''}
                  otpFalló={otp.otpFalló}
                  codigoVerif={otp.codigoVerif}
                  error={otp.error}
                  loading={otp.loading}
                  reenvioLoad={otp.reenvioLoad}
                  setCodigoVerif={otp.setCodigoVerif}
                  onSubmit={otp.verificar}
                  onReenviar={otp.reenviar}
                />
              ) : pagoPendiente ? (
                <div key="pago" className="space-y-4">
                  <OnvoSuscripcionEmbed
                    subscriptionId={pagoPendiente.subscriptionId}
                    customerId={pagoPendiente.customerId}
                    publishableKey={pagoPendiente.publishableKey}
                    onSuccess={() => void irAExito()}
                    onError={() => {}}
                  />
                  {errorCobro && <p role="alert" className="rounded-[12px] border border-hc-red-500 p-3 text-[13px] text-hc-n-900">{errorCobro}</p>}
                  <button
                    type="button"
                    onClick={cancelarPago}
                    className="w-full py-1.5 text-center text-[13px] font-semibold text-hc-blue-600"
                  >
                    Volver
                  </button>
                </div>
              ) : errorPlan ? (
                <div key="error" role="alert" aria-live="assertive" className="flex flex-col items-start gap-3 py-4">
                  <p className="text-[14px] text-hc-n-900">{errorPlan}</p>
                  <button type="button" onClick={() => { setErrorPlan(''); setBuscandoPlan(true); setCarga((n) => n + 1) }}
                    className="inline-flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-5 text-[15px] font-semibold text-white">
                    {t('comun.reintentar', { defaultValue: 'Reintentar' })}
                  </button>
                </div>
              ) : (
                <div key="cargando" className="flex flex-col gap-3 py-4" aria-busy="true" aria-live="polite">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-hc-n-100" />
                  <div className="h-24 animate-pulse rounded-[12px] bg-hc-n-100" />
                  <p className="sr-only">Preparando tu suscripción…</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-hc-n-200 bg-hc-n-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            disabled={!planId || loadingPlan}
            onClick={() => { if (planId) void seleccionarPlan(planId) }}
            className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-hc-red-500 text-[15px] font-semibold text-white disabled:bg-hc-n-200 disabled:text-hc-n-600"
          >
            {t('registroVendedor.boton.pagarActivar', { plan: plan.nombre, defaultValue: `Pagar y activar ${plan.nombre}` })}
          </button>
          <Link to={RUTA_PANEL_VENDEDOR} className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 text-[15px] font-semibold text-hc-n-900 no-underline">
            Pagar después
          </Link>
          <p className="text-center text-[12px] text-hc-n-600">{textoPagarDespues(plan.nombre)}</p>
        </div>
      </main>
    </div>
  )
}
