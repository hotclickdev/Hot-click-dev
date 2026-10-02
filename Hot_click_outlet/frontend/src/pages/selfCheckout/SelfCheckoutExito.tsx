import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import QrPagina from '@/features/qr-negocio/QrPagina'
import QrResultado from '@/features/qr-negocio/QrResultado'
import SelfCheckoutHeader from './SelfCheckoutHeader'
import { fmt, numeroConGato } from './selfCheckoutFormat'
import type { MesaSelfCheckout, PedidoResultSelfCheckout, ResumenPedidoSelfCheckout } from './selfCheckoutTypes'

type Props = Readonly<{
  mesa: MesaSelfCheckout | null
  pedidoResult: PedidoResultSelfCheckout | null
  resumen: ResumenPedidoSelfCheckout | null
  onOtroPedido: () => void
}>

/** Pedido enviado (Figma `29:1741`): confirmación, "Tu pedido", cómo pagar y "Agregar algo más". */
export default function SelfCheckoutExito({ mesa, pedidoResult, resumen, onOtroPedido }: Props) {
  const { t } = useTranslation()
  const lineas = resumen?.lineas ?? []
  const total =
    pedidoResult?.total ?? lineas.reduce((s, { producto, cantidad }) => s + (producto.precio ?? 0) * cantidad, 0)

  return (
    <QrPagina>
      <SelfCheckoutHeader mesa={mesa} />
      <QrResultado
        compacto
        tono="exito"
        icono={ICONOS_QR.check}
        titulo={t('pos.mesa.enviadoTitulo')}
        descripcion={t('pos.mesa.enviadoDesc', {
          negocio: mesa?.empresaNombre ?? '',
          mesa: mesa?.mesaNombre ?? '',
        })}
      >
        {pedidoResult?.numeroPedido ? (
          <span className="rounded-full bg-[var(--hc-blue-50)] px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-[var(--hc-blue-600)]">
            {t('pos.mesa.enviadoEstado', { numero: numeroConGato(pedidoResult.numeroPedido) })}
          </span>
        ) : null}
      </QrResultado>

      <div className="flex flex-col gap-3 px-4 py-3">
        {lineas.length > 0 ? (
          <section className="flex flex-col gap-2 rounded-[16px] border border-[var(--hc-n-200)] bg-[var(--hc-n-0)] p-4">
            <h2 className="font-sans text-[14px] font-semibold leading-4 tracking-normal text-[var(--hc-n-900)]">
              {t('pos.mesa.tuPedido')}
            </h2>
            <ul className="flex flex-col gap-2">
              {lineas.map(({ producto, cantidad }) => (
                <li key={String(producto.id)} className="flex items-center justify-between gap-3 text-[14px] leading-4">
                  <span className="min-w-0 truncate text-[var(--hc-n-600)]">
                    {cantidad} × {producto.nombre}
                  </span>
                  <span className="shrink-0 text-[var(--hc-n-900)]">{fmt((producto.precio ?? 0) * cantidad)}</span>
                </li>
              ))}
            </ul>
            <div className="h-px bg-[var(--hc-n-200)]" />
            <div className="flex items-center justify-between text-[var(--hc-n-900)]">
              <span className="text-[15px] font-semibold leading-[18px]">{t('pos.mesa.total')}</span>
              <span className="font-display text-[18px] font-bold leading-[23px]">{fmt(total)}</span>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-1 rounded-[16px] bg-[var(--hc-blue-50)] p-4">
          <h2 className="font-sans text-[14px] font-semibold leading-[normal] tracking-normal text-[var(--hc-blue-600)]">
            {t('pos.mesa.pagoTitulo')}
          </h2>
          <p className="text-[13px] leading-[18px] text-[var(--hc-n-600)]">{t('pos.mesa.pagoDesc')}</p>
        </section>
      </div>

      <div className="px-4 pb-6 pt-2">
        <button
          type="button"
          onClick={onOtroPedido}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--hc-n-200)] bg-[var(--hc-n-0)] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-[var(--hc-n-900)]"
        >
          <img src={ICONOS_QR.agregarMas} alt="" className="size-[18px]" />
          {t('pos.mesa.agregarMas')}
        </button>
      </div>
    </QrPagina>
  )
}
