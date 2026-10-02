import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { nombreItem, tituloYCodigo } from './posPagoFormat'
import type { QrPagoItem } from './posPagoTypes'

/**
 * Detalle de lo que se paga. Figma no lo dibuja en la pantalla de método; se
 * conserva (el comprador debe ver qué paga) con la tarjeta "Tu pedido" de
 * `29:1761`.
 */
export default function PosPagoPedido({ items }: Readonly<{ items: QrPagoItem[] }>) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <section className="px-4 pb-3">
      <div className="flex flex-col gap-2 rounded-[16px] border border-[var(--hc-n-200)] bg-[var(--hc-n-0)] p-4">
        <h2 className="font-sans text-[14px] font-semibold leading-[normal] tracking-normal text-[var(--hc-n-900)]">
          {t('pos.pago.tuPedido')}
        </h2>
        <ul className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const cantidad = Math.max(1, item.cantidad ?? 1)
            const { titulo } = tituloYCodigo(nombreItem(item))
            return (
              <li
                key={`${item.productoId ?? idx}-fila`}
                className="flex items-center justify-between gap-3 text-[14px]"
              >
                <span className="min-w-0 truncate text-[var(--hc-n-600)]">
                  {cantidad} × {titulo}
                </span>
                <span className="shrink-0 text-[var(--hc-n-900)]">
                  {formatPrice((item.precioUnitario ?? 0) * cantidad)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
