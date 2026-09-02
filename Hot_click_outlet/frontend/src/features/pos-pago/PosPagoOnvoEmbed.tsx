import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { formatColones } from './posPagoFormat'
import PosPagoReporteModal from './PosPagoReporteModal'

const ONVO_SDK_URL = 'https://sdk.onvopay.com/sdk.js'

type OnvoPayInstance = {
  render: (selector: string) => void
  submitPayment: () => void
}

type OnvoGlobal = {
  pay: (opts: {
    publicKey: string
    paymentIntentId: string
    paymentType: 'one_time'
    locale?: string
    manualSubmit?: boolean
    onSuccess: (data: unknown) => void
    onError: (data: { message?: string }) => void
  }) => OnvoPayInstance
}

declare global {
  interface Window {
    onvo?: OnvoGlobal
  }
}

let sdkPromise: Promise<void> | null = null

function cargarSdkOnvo(): Promise<void> {
  if (window.onvo) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = ONVO_SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('onvo_sdk'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

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
        className="min-h-[120px] rounded-2xl border p-3"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
      />
      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-center text-red-500">{t('pos.pago.errorPagoDesc')}</p>
          <button
            type="button"
            onClick={() => setReporteAbierto(true)}
            className="w-full rounded-[14px] border border-[var(--hc-border)] py-3 text-sm font-semibold text-[var(--hc-text)]"
            style={{ background: 'var(--hc-surface)' }}
          >
            {t('pos.pago.reportarError')}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => instanciaRef.current?.submitPayment()}
        className="w-full rounded-[14px] py-4 text-[15px] font-bold text-white"
        style={{ background: 'var(--hc-primary)' }}
      >
        {t('pos.pago.pagar', { monto: formatColones(total) })}
      </button>
      <p className="text-xs text-center text-[var(--hc-muted)]">{t('pos.pago.walletsAviso')}</p>
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError="onvo_embed"
      />
    </div>
  )
}
