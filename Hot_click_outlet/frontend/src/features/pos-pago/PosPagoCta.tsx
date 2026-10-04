import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import { formatMiles } from '@/utils/format'

type Props = {
  monto: number
  onClick: () => void
  cargando?: boolean
  disabled?: boolean
  /** Texto del botón; por defecto "Pagar ₡monto". */
  etiqueta?: string
  /** Ícono del botón (Figma lo dibuja solo en SINPE). */
  icono?: string
  avisoKey?: 'pos.pago.hostedAviso' | 'pos.pago.walletsAviso'
}

/** Pie de pago (Figma `29:1819`): botón rojo de 46 y "Pago protegido por HotClick". */
export default function PosPagoCta({ monto, onClick, cargando, disabled, etiqueta, icono, avisoKey }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-2 bg-hc-n-0 px-4 pb-6 pt-3">
      <button
        type="button"
        disabled={disabled || cargando}
        onClick={onClick}
        className="hc-btn-primary flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-focus-ring"
      >
        {icono && !cargando ? <img src={icono} alt="" className="size-[18px] shrink-0" /> : null}
        {cargando ? t('pos.pago.procesando') : (etiqueta ?? t('pos.pago.pagar', { monto: formatMiles(monto) }))}
      </button>
      {avisoKey ? (
        <p className="text-center text-[12px] leading-[14px] text-hc-n-600">{t(avisoKey)}</p>
      ) : null}
      <p className="flex items-center justify-center gap-[6px] text-[12px] leading-[14px] text-hc-n-600">
        <img src={ICONOS_QR.candado} alt="" className="size-[13px]" />
        {t('pos.pago.protegido')}
      </p>
    </div>
  )
}
