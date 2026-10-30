import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { billingService } from '@/services/billingService'
import PagoPlanEmbed from '@/features/billing/PagoPlanEmbed'
import { pagoPendienteDe, type PagoPlanPendiente } from '@/features/billing/useCambiarPlan'
import { nombrePlanVisible } from '@/components/ui/planPendiente'
import { formatMontoMoneda } from '@/utils/format'
import PedidosDeGracia from './PedidosDeGracia'
import { useSuspensionStore, type EstadoImpago } from './suspensionImpaga'

/**
 * Suscripción impaga (día 9+): única pantalla del panel. Datos de la cuenta, monto pendiente y pagar por ONVO.
 * La tienda vuelve cuando el webhook ONVO confirma el cobro; mientras tanto el backend responde 403 a todo lo demás.
 */
export default function CuentaSuspendidaPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const marcar = useSuspensionStore((s) => s.marcar)
  const [estado, setEstado] = useState<EstadoImpago | null>(null)
  const [error, setError] = useState(false)
  const [pago, setPago] = useState<PagoPlanPendiente | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const { data } = await billingService.getImpago()
      setEstado(data)
      setError(false)
      if (!data.suspendida) {
        marcar(false)
        navigate('/', { replace: true })
      }
    } catch {
      setError(true)
    }
  }, [marcar, navigate])

  useEffect(() => { void cargar() }, [cargar])

  // Tras pagar, ONVO confirma por webhook: se reconsulta hasta que la tienda vuelva a ACTIVO.
  useEffect(() => {
    if (!confirmando) return
    const id = setInterval(() => { void cargar() }, 5000)
    return () => clearInterval(id)
  }, [confirmando, cargar])

  const pagar = async () => {
    setIniciando(true)
    setError(false)
    try {
      const { data } = await billingService.pagarImpago()
      const p = pagoPendienteDe(data)
      if (p) setPago(p)
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setIniciando(false)
    }
  }

  const monto = estado?.montoPendiente != null ? formatMontoMoneda(estado.montoPendiente, estado.moneda, i18n.language) : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-5 p-6">
      <h1 className="text-2xl font-semibold">{t('suspension.titulo')}</h1>
      <p className="text-hc-muted">{t('suspension.explicacion')}</p>

      {estado && (
        <section className="rounded-lg border p-4" style={{ borderColor: 'var(--hc-border)' }}>
          <h2 className="mb-2 font-medium">{t('suspension.cuenta')}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt>{t('suspension.negocio')}</dt><dd>{estado.nombreEmpresa}</dd>
            <dt>{t('suspension.correo')}</dt><dd>{estado.correoEmpresa}</dd>
            {estado.planPendiente && (<><dt>{t('suspension.plan')}</dt><dd>{nombrePlanVisible(estado.planPendiente)}</dd></>)}
            {estado.fechaVencPlan && (<><dt>{t('suspension.vencio')}</dt><dd>{estado.fechaVencPlan}</dd></>)}
          </dl>
          <p className="mt-3 text-lg font-semibold">
            {t('suspension.montoPendiente')}: {monto ?? t('suspension.sinMonto')}
          </p>
        </section>
      )}

      {estado?.enExtension && <PedidosDeGracia venceEn={estado.extensionVenceEn} />}

      {error && <p role="alert" className="text-red-600">{t('suspension.error')}</p>}
      {confirmando && <p role="status">{t('suspension.confirmando')}</p>}

      {pago && !confirmando ? (
        <PagoPlanEmbed pago={pago} onPagado={() => setConfirmando(true)} onVolver={() => setPago(null)} />
      ) : (
        !confirmando && (
          <button
            type="button"
            className="rounded-md px-4 py-3 font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--hc-accent)' }}
            disabled={iniciando || !estado?.montoPendiente}
            onClick={() => { void pagar() }}
          >
            {iniciando ? t('suspension.iniciando') : t('suspension.pagar')}
          </button>
        )
      )}
    </main>
  )
}

