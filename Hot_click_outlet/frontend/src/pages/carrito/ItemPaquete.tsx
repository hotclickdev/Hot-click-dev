import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { fotoProducto } from '@/components/comprador/productCardHelpers'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { formatPrice } from '@/utils/format'
import type { ItemCarrito } from '@/types/carrito'
import CantidadPaquete from './CantidadPaquete'

const STOCK_MAXIMO_POR_DEFECTO = 99

type ItemPaqueteProps = {
  item: ItemCarrito
  onCambiarCantidad: (item: ItemCarrito, cantidad: number) => void
  onEliminar: (item: ItemCarrito) => void
  onMoverAFavoritos: (item: ItemCarrito) => void
}

/** Producto dentro de un paquete: móvil `37:1528`, desktop `38:1373`. */
export default function ItemPaquete({ item, onCambiarCantidad, onEliminar, onMoverAFavoritos }: ItemPaqueteProps) {
  const { t } = useTranslation()
  const nombre = item.nombre ?? item.nombreProducto ?? ''
  const precio = formatPrice((item.precio ?? item.precioVenta ?? 0) * item.cantidad)
  const foto = fotoProducto(item)
  const cantidad = (
    <CantidadPaquete
      cantidad={item.cantidad}
      nombre={nombre}
      maximo={item.stock ?? STOCK_MAXIMO_POR_DEFECTO}
      onCambiar={(nueva) => onCambiarCantidad(item, nueva)}
      className="py-[4px] lg:py-[5px]"
    />
  )

  return (
    <div className="flex items-start gap-[12px] lg:items-center lg:gap-[16px] lg:border-t lg:border-hc-n-200 lg:px-[18px] lg:py-[14px]">
      <div className="size-[60px] shrink-0 overflow-hidden rounded-[10px] bg-hc-n-100 lg:size-[72px]">
        {foto ? <img src={foto} alt="" className="size-full object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[6px] lg:gap-[4px]">
        <p className="text-[14px] font-medium leading-[18px] text-hc-n-900 lg:text-[15px] lg:leading-normal">{nombre}</p>
        <p className="font-display text-[15px] font-bold text-hc-n-900 lg:hidden">{precio}</p>
        <div className="flex items-center gap-[12px] lg:hidden">
          {cantidad}
          <button type="button" onClick={() => onEliminar(item)} aria-label={t('compra.carrito.eliminarDe', { nombre })} className="text-hc-n-500">
            <IconoFigma src={ICONOS_COMPRA.eliminar} size={16} />
          </button>
        </div>
        <div className="hidden items-center gap-[14px] text-[12px] font-semibold lg:flex">
          <button type="button" onClick={() => onMoverAFavoritos(item)} className="text-hc-blue-600">
            {t('compra.carrito.moverFavoritos')}
          </button>
          <button type="button" onClick={() => onEliminar(item)} className="text-hc-n-600">
            {t('compra.carrito.eliminar')}
          </button>
        </div>
      </div>
      <div className="hidden lg:block">{cantidad}</div>
      <p className="hidden font-display text-[17px] font-bold text-hc-n-900 lg:block">{precio}</p>
    </div>
  )
}
