import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import { formatPrice } from '@/utils/format'

type Props = Readonly<{
  total?: number
  /** `mm:ss` que falta para que venza el cobro; sin dato no se dibuja la línea. */
  restante: string | null
}>

/** Monto a pagar y vencimiento (Figma `29:1792`). */
export default function PosPagoMonto({ total, restante }: Props) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col items-center gap-1 bg-hc-n-0 px-4 py-6">
      <p className="text-[13px] leading-[15px] text-hc-n-500">{t('pos.pago.totalAPagar')}</p>
      <p className="font-display text-[40px] font-extrabold leading-[50px] tracking-normal text-hc-n-900">
        {formatPrice(total ?? 0)}
      </p>
      {restante ? (
        <p className="flex items-center justify-center gap-[6px] text-[12px] font-medium leading-[14px] text-hc-warning">
          <img src={ICONOS_QR.vence} alt="" className="size-[14px]" />
          {t('pos.pago.vence', { tiempo: restante })}
        </p>
      ) : null}
    </section>
  )
}
