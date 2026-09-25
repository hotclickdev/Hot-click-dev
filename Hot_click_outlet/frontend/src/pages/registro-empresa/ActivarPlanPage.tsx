import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
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

type PlanApi = { id: Id; nombre: string }

export default function ActivarPlanPage() {
  const [searchParams] = useSearchParams()
  const planQuery = leerPlanQuery(searchParams.toString())
  const correoVerificado = useAuthStore((s) => s.correoVerificado)
  const userEmail = useAuthStore((s) => s.userEmail)
  const token = useAuthStore((s) => s.token)

  const otp = useVerificarCorreoOtp(userEmail ?? '')
  const puedeActivar = correoVerificado || otp.verificado

  const [planId, setPlanId] = useState<Id | null>(null)
  const [buscandoPlan, setBuscandoPlan] = useState(true)
  const [errorPlan, setErrorPlan] = useState('')
  const [intentado, setIntentado] = useState(false)

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
  }, [planQuery])

  useEffect(() => {
    if (!puedeActivar || !planId || intentado) return
    setIntentado(true)
    void seleccionarPlan(planId)
  }, [puedeActivar, planId, intentado, seleccionarPlan])

  if (!token) return <Navigate to="/registro-empresa" replace />
  if (!planQuery) return <Navigate to="/registro-empresa" replace />

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ fontFamily: 'var(--hc-font-text)', background: 'var(--hc-bg)' }}>
      <div className="flex items-center justify-between w-full px-6 py-4" style={{ borderBottom: '1px solid var(--hc-border)' }}>
        <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
          <HotClickMark size={28} className="shrink-0" />
          <span className="hc-wordmark" style={{ fontSize: '1rem' }}>
            <span className="hot">Hot</span><span className="click">Click</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-10 w-full max-w-[460px]">
        <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 8px 40px var(--hc-shadow)' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--hc-primary), transparent)' }} />
          <div className="p-6 sm:p-8">

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
                  <div className="text-center mb-2">
                    <h2 className="font-bold text-lg" style={{ color: 'var(--hc-text)' }}>Activá tu plan {pagoPendiente.planNombre}</h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Confirmá el pago para activar tu suscripción.</p>
                  </div>
                  <OnvoSuscripcionEmbed
                    subscriptionId={pagoPendiente.subscriptionId}
                    customerId={pagoPendiente.customerId}
                    publishableKey={pagoPendiente.publishableKey}
                    onSuccess={() => void irAExito()}
                    onError={() => {}}
                  />
                  {errorCobro && <p className="text-sm text-center text-red-500">{errorCobro}</p>}
                  <button
                    type="button"
                    onClick={cancelarPago}
                    className="w-full text-center text-xs py-1.5"
                    style={{ color: 'var(--hc-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Volver
                  </button>
                </div>
              ) : (
                <div key="cargando" className="text-center py-6">
                  <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
                    {buscandoPlan || loadingPlan ? 'Preparando tu suscripción…' : (errorPlan || 'Un momento…')}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Link
          to={RUTA_PANEL_VENDEDOR}
          className="mt-5 w-full text-center text-sm py-2 rounded-xl hover:opacity-70"
          style={{ color: 'var(--hc-muted)', textDecoration: 'none' }}
        >
          Continuar y pagar después
        </Link>
      </div>
    </div>
  )
}
