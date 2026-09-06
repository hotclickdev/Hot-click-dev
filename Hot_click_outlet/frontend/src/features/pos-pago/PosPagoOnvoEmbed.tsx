import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { cargarSdkOnvo, ESTILO_PAD_ONVO, type OnvoPayInstance } from '@/features/billing/onvoSdk'
import PosPagoCta from './PosPagoCta'
import PosPagoReporteModal from './PosPagoReporteModal'

const PUBLISHABLE_ENV = import.meta.env.VITE_ONVO_PUBLISHABLE_KEY as string | undefined

type Props = {
  token: string
  onSuccess: () => void
  onFallback: () => void
  total: number
}

export default function PosPagoOnvoEmbed({ token, onSuccess, onFallback, total }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [listo, setListo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const instanciaRef = useRef<OnvoPayInstance | null>(null)

  useEffect(() => {
    let activo = true

    const iniciar = async () => {
      try {
        const intent = await posService.iniciarPaymentIntentQr(token) as {
          paymentIntentId?: string
          publishableKey?: string
        }
        const publicKey = intent.publishableKey || PUBLISHABLE_ENV
        if (!intent.paymentIntentId || !publicKey) {
          onFallback()
          return
        }
        await cargarSdkOnvo()
        if (!activo || !containerRef.current || !window.onvo) {
          onFallback()
          return
        }
        instanciaRef.current = window.onvo.pay({
          publicKey,
          paymentIntentId: intent.paymentIntentId,
          paymentType: 'one_time',
          locale: 'es',
          manualSubmit: true,
          onSuccess: () => onSuccess(),
          onError: () => setError(true),
        })
        instanciaRef.current.render('#onvo-pos-pago-container')
        setListo(true)
      } catch {
        onFallback()
      } finally {
        if (activo) setCargando(false)
      }
    }
    void iniciar()
    return () => { activo = false }
  }, [token, onSuccess, onFallback])

  if (cargando) {
    return (
      <p className="text-sm text-center text-[var(--hc-muted)] py-4">
        {t('pos.pago.cargandoPasarela')}
      </p>
    )
  }

  if (!listo) return null

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div
        id="onvo-pos-pago-container"
        ref={containerRef}
        className="min-h-[120px] rounded-[22px] border p-3 shadow-[var(--hc-shadow-1)]"
        style={ESTILO_PAD_ONVO}
      />
      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-center text-red-500">{t('pos.pago.errorPagoDesc')}</p>
          <button
            type="button"
            onClick={() => setReporteAbierto(true)}
            className="w-full min-h-11 rounded-2xl border border-[var(--hc-border)] py-3 text-sm font-semibold text-[var(--hc-text)]"
            style={{ background: 'var(--hc-surface)' }}
          >
            {t('pos.pago.reportarError')}
          </button>
        </div>
      ) : null}
      <PosPagoCta
        monto={total}
        onClick={() => instanciaRef.current?.submitPayment()}
        avisoKey="pos.pago.walletsAviso"
      />
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError="onvo_embed"
      />
    </div>
  )
}
