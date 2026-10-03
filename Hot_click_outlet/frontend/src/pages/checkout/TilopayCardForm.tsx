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
        <div className="rounded-[8px] bg-hc-warning-bg px-2 py-[6px] text-[11px] font-medium leading-[15px] text-hc-warning">
          {t('checkout.tilopayTestBanner')}
        </div>
      )}

      <p className="text-[13px] leading-[18px] text-hc-n-600">
        {t('checkout.tilopayAmount', { amount: formatPrice(monto) })}
      </p>

      <form
        className="flex flex-col gap-[14px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4"
        onSubmit={(e) => { e.preventDefault(); void onPagar() }}
      >
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="tlpy_payment_method" className="text-[13px] font-semibold text-hc-n-900">
            {t('checkout.tilopayMethod')}
          </label>
          <select
            id="tlpy_payment_method"
            name="tlpy_payment_method"
            className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none focus:border-hc-blue-600 lg:rounded-[10px] lg:py-3"
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="tlpy_saved_cards" className="text-[13px] font-semibold text-hc-n-900">
            {t('checkout.tilopaySavedCards')}
          </label>
          <select
            id="tlpy_saved_cards"
            name="tlpy_saved_cards"
            className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none focus:border-hc-blue-600 lg:rounded-[10px] lg:py-3"
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="tlpy_cc_number" className="text-[13px] font-semibold text-hc-n-900">
            {t('checkout.tilopayCardNumber')}
          </label>
          <input
            type="text"
            id="tlpy_cc_number"
            name="tlpy_cc_number"
            autoComplete="cc-number"
            inputMode="numeric"
            className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none focus:border-hc-blue-600 lg:rounded-[10px] lg:py-3"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="tlpy_cc_expiration_date" className="text-[13px] font-semibold text-hc-n-900">
              {t('checkout.tilopayExpiry')}
            </label>
            <input
              type="text"
              id="tlpy_cc_expiration_date"
              name="tlpy_cc_expiration_date"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none focus:border-hc-blue-600 lg:rounded-[10px] lg:py-3"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="tlpy_cvv" className="text-[13px] font-semibold text-hc-n-900">
              {t('checkout.tilopayCvv')}
            </label>
            <input
              type="text"
              id="tlpy_cvv"
              name="tlpy_cvv"
              autoComplete="cc-csc"
              inputMode="numeric"
              className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[18px] text-hc-n-900 outline-none focus:border-hc-blue-600 lg:rounded-[10px] lg:py-3"
            />
          </div>
        </div>

        {errorInit && (
          <p role="alert" className="text-[12px] leading-4 text-hc-danger">{errorInit}</p>
        )}

        <button
          type="submit"
          disabled={!listo || pagando || Boolean(errorInit)}
          className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="flex min-h-12 w-full items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 text-[15px] font-semibold text-hc-n-900"
        >
          {t('checkout.tilopayChangeMethod')}
        </button>
      )}
    </div>
  )
}
