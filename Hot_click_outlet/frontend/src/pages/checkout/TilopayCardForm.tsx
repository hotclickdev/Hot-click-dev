import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import { useTilopaySdk } from '@/hooks/useTilopaySdk'

const ES_MODO_PRUEBA =
  import.meta.env.VITE_TILOPAY_TEST === 'true'
  || import.meta.env.MODE === 'development'

type TilopayCardFormProps = {
  sdkToken: string
  monto: number
  orderNumber: string
  redirectUrl?: string
  onVolver?: () => void
}

/**
 * Formulario embebido Tilopay SDK v2 — ids de contrato fijos.
 * `#responseTilopay` debe vivir fuera del `<form>`.
 */
export default function TilopayCardForm({
  sdkToken,
  monto,
  orderNumber,
  redirectUrl,
  onVolver,
}: TilopayCardFormProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { init, startPayment } = useTilopaySdk()
  const [listo, setListo] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [errorInit, setErrorInit] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    const redirect =
      redirectUrl
      || `${globalThis.location.origin}/pago/tilopay/respuesta`

    void (async () => {
      try {
        await init({
          token: sdkToken,
          amount: monto,
          orderNumber,
          redirect,
          currency: 'CRC',
          language: 'es',
        })
        if (activo) {
          setListo(true)
          setErrorInit(null)
        }
      } catch {
        if (activo) {
          setErrorInit(t('checkout.tilopayInitError'))
          showToast(t('checkout.tilopayInitError'), 'error')
        }
      }
    })()

    return () => { activo = false }
  }, [sdkToken, monto, orderNumber, redirectUrl, init, showToast, t])

  async function onPagar() {
    if (!listo || pagando) return
    setPagando(true)
    try {
      await startPayment()
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message
        ? err.message
        : t('checkout.tilopayPayError')
      showToast(msg, 'error')
      setPagando(false)
    }
  }

  return (
    <div className="space-y-4">
      {ES_MODO_PRUEBA && (
        <div
          className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{
            background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
            border: '1px solid color-mix(in srgb, #f59e0b 35%, transparent)',
            color: '#fbbf24',
          }}
        >
          {t('checkout.tilopayTestBanner')}
        </div>
      )}

      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
        {t('checkout.tilopayAmount', { amount: formatPrice(monto) })}
      </p>

      <form
        className="space-y-3 rounded-xl p-4"
        style={{ background: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}
        onSubmit={(e) => { e.preventDefault(); void onPagar() }}
      >
        <div className="space-y-1">
          <label htmlFor="tlpy_payment_method" className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {t('checkout.tilopayMethod')}
          </label>
          <select
            id="tlpy_payment_method"
            name="tlpy_payment_method"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="tlpy_saved_cards" className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {t('checkout.tilopaySavedCards')}
          </label>
          <select
            id="tlpy_saved_cards"
            name="tlpy_saved_cards"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="tlpy_cc_number" className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {t('checkout.tilopayCardNumber')}
          </label>
          <input
            type="text"
            id="tlpy_cc_number"
            name="tlpy_cc_number"
            autoComplete="cc-number"
            inputMode="numeric"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="tlpy_cc_expiration_date" className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {t('checkout.tilopayExpiry')}
            </label>
            <input
              type="text"
              id="tlpy_cc_expiration_date"
              name="tlpy_cc_expiration_date"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="tlpy_cvv" className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {t('checkout.tilopayCvv')}
            </label>
            <input
              type="text"
              id="tlpy_cvv"
              name="tlpy_cvv"
              autoComplete="cc-csc"
              inputMode="numeric"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
            />
          </div>
        </div>

        {errorInit && (
          <p className="text-xs text-red-400">{errorInit}</p>
        )}

        <button
          type="submit"
          disabled={!listo || pagando || Boolean(errorInit)}
          className="hc-btn hc-btn-primary w-full !h-12 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pagando ? t('checkout.tilopayProcessing') : t('checkout.tilopayPay', { amount: formatPrice(monto) })}
        </button>
      </form>

      {/* Contrato Tilopay: fuera del form */}
      <div id="responseTilopay" />

      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="w-full min-h-11 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--hc-muted)' }}
        >
          {t('checkout.tilopayChangeMethod')}
        </button>
      )}
    </div>
  )
}
