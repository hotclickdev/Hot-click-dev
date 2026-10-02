import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'

type Props = Readonly<{
  metodo: 'SINPE' | 'TARJETA'
}>

/**
 * Método de pago del cobro (Figma `29:1800`). El cajero fija el método al
 * generar el QR, así que solo se dibuja el elegido, ya seleccionado.
 */
export default function PosPagoMetodo({ metodo }: Props) {
  const { t } = useTranslation()
  const esSinpe = metodo === 'SINPE'
  return (
    <section className="flex flex-col gap-3 px-4 pb-3 pt-[18px]">
      <h2 className="font-sans text-[15px] font-semibold leading-[18px] tracking-normal text-[var(--hc-n-900)]">
        {t('pos.pago.elegirMetodo')}
      </h2>
      <div className="flex items-center gap-3 rounded-[16px] border-[1.5px] border-[var(--hc-blue-600)] bg-[var(--hc-blue-50)] p-4">
        <img src={esSinpe ? ICONOS_QR.metodoSinpe : ICONOS_QR.metodoTarjeta} alt="" className="size-6 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p className="text-[15px] font-semibold leading-[18px] text-[var(--hc-n-900)]">
            {esSinpe ? t('pos.pago.sinpeMetodo') : t('pos.pago.tarjetaMetodo')}
          </p>
          <p className="text-[12px] leading-[14px] text-[var(--hc-n-500)]">
            {esSinpe ? t('pos.pago.sinpeMetodoDesc') : t('pos.pago.tarjetaMetodoDesc')}
          </p>
        </div>
        <img src={ICONOS_QR.radioActivo} alt="" className="size-[22px] shrink-0" />
      </div>
    </section>
  )
}
