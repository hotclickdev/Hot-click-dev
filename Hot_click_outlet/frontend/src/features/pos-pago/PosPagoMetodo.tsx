import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import type { MetodoQr } from './posPagoTypes'

type Props = Readonly<{
  /** Métodos que habilitó la caja para este cobro. */
  metodos: MetodoQr[]
  elegido: MetodoQr
  onElegir: (metodo: MetodoQr) => void
}>

/**
 * Método de pago del cobro (Figma `29:1800`). El cliente elige entre los
 * métodos que habilitó la caja (decisión B16); con uno solo queda marcado.
 */
export default function PosPagoMetodo({ metodos, elegido, onElegir }: Props) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3 px-4 pb-3 pt-[18px]">
      <h2 id="pos-pago-metodo" className="font-sans text-[15px] font-semibold leading-[18px] tracking-normal text-hc-n-900">
        {t('pos.pago.elegirMetodo')}
      </h2>
      <div role="radiogroup" aria-labelledby="pos-pago-metodo" className="flex flex-col gap-3">
        {metodos.map((metodo) => {
          const esSinpe = metodo === 'SINPE'
          const activo = metodo === elegido
          return (
            <button
              key={metodo}
              type="button"
              role="radio"
              aria-checked={activo}
              data-testid={`pos-pago-metodo-${metodo.toLowerCase()}`}
              onClick={() => onElegir(metodo)}
              className={`flex min-h-[44px] items-center gap-3 rounded-[16px] p-4 text-left ${
                activo
                  ? 'border-[1.5px] border-hc-blue-600 bg-hc-blue-50'
                  : 'border border-hc-n-200 bg-hc-n-0'
              }`}
            >
              <img src={esSinpe ? ICONOS_QR.metodoSinpe : ICONOS_QR.metodoTarjeta} alt="" className="size-6 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[15px] font-semibold leading-[18px] text-hc-n-900">
                  {esSinpe ? t('pos.pago.sinpeMetodo') : t('pos.pago.tarjetaMetodo')}
                </span>
                <span className="text-[12px] leading-[14px] text-hc-n-600">
                  {esSinpe ? t('pos.pago.sinpeMetodoDesc') : t('pos.pago.tarjetaMetodoDesc')}
                </span>
              </span>
              <img src={activo ? ICONOS_QR.radioActivo : ICONOS_QR.radioVacio} alt="" className="size-[22px] shrink-0" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
