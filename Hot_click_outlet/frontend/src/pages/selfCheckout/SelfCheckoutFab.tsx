import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import { fmt } from './selfCheckoutFormat'

/** Carrito flotante (Figma `29:1731`): resumen oscuro de 60 con "Enviar pedido". */
export default function SelfCheckoutFab({
  totalItems,
  totalPrecio,
  onVerPedido,
}: Readonly<{
  totalItems: number
  totalPrecio: number
  onVerPedido: () => void
}>) {
  const { t } = useTranslation()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex h-[60px] w-full max-w-[358px] items-center gap-3 rounded-[16px] bg-hc-n-900 py-2 pl-4 pr-2 shadow-[0_8px_20px_rgba(0,0,0,0.2)]">
        <img src={ICONOS_QR.carrito} alt="" className="size-[22px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
          <span className="text-[12px] leading-[14px] text-hc-n-400">
            {t('pos.mesa.productos', { count: totalItems })}
          </span>
          <span className="font-display text-[16px] font-bold leading-5 text-white">{fmt(totalPrecio)}</span>
        </div>
        <button
          type="button"
          onClick={onVerPedido}
          className="shrink-0 rounded-[12px] bg-hc-red-500 px-4 py-3 text-[14px] font-semibold leading-4 text-white"
        >
          {t('pos.mesa.enviarPedido')}
        </button>
      </div>
    </div>
  )
}
