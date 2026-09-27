import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { estaDisponible } from './useCarritoRecuperado'
import type { ProductoRecuperado as LineaRecuperada } from './useCarritoRecuperado'

/** Fila de producto del carrito recuperado (Figma `29:2050`). */
export default function ProductoRecuperado({ linea }: { linea: LineaRecuperada }) {
  const { t } = useTranslation()
  const disponible = estaDisponible(linea)
  const tienda = [
    linea.producto?.empresaNombre?.trim() || 'HotClick',
    linea.cantidad > 1 ? t('compra.unidades', { count: linea.cantidad }) : null,
  ].filter(Boolean).join(' · ')
  return (
    <li className={`flex items-center gap-[12px] ${disponible ? '' : 'opacity-60'}`}>
      {linea.imagen ? (
        <img src={linea.imagen} alt="" width={64} height={64} loading="lazy" className="size-[64px] shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span className="size-[64px] shrink-0 rounded-[10px] bg-hc-n-100" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="truncate text-[14px] font-medium text-hc-n-900">{linea.nombre}</span>
        <span className="truncate text-[12px] text-hc-n-500">{tienda}</span>
        <span className={`text-[11px] font-semibold ${disponible ? 'text-hc-green-600' : 'text-hc-red-600'}`}>
          {disponible ? t('compra.recuperar.disponible', { count: linea.producto.stock }) : t('compra.recuperar.agotado')}
        </span>
      </span>
      {disponible ? (
        <span className="shrink-0 font-display text-[15px] font-bold text-hc-n-900">
          {formatPrice(linea.producto.precio * Math.min(linea.cantidad, linea.producto.stock))}
        </span>
      ) : null}
    </li>
  )
}
