import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { formatPrice } from '@/utils/format'
import { imagenItemCarrito, STOCK_MAX_VISIBLE, subtotalItem } from './cartHelpers'
import { PackagePlaceholder } from './cartIcons'
import type { ItemCarrito } from '@/types/carrito'

type FilaProductoCarritoProps = {
  item: ItemCarrito
  escritorio: boolean
  onCantidad: (item: ItemCarrito, cantidad: number) => void
  onQuitar: (item: ItemCarrito) => void
  onMoverAFavoritos: (item: ItemCarrito) => void
}

/** Botón con el glifo de 14 px del Figma y un área táctil mayor. */
function BotonCantidad({ icono, etiqueta, deshabilitado, onClick }: { icono: string; etiqueta: string; deshabilitado?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      className="relative flex size-[14px] items-center justify-center text-hc-n-600 after:absolute after:-inset-2 disabled:opacity-30"
    >
      <IconoFigma src={icono} size={14} />
    </button>
  )
}

function Cantidad({ item, escritorio, onCantidad }: Pick<FilaProductoCarritoProps, 'item' | 'escritorio' | 'onCantidad'>) {
  const { t } = useTranslation()
  const stockMax = item.stock ?? STOCK_MAX_VISIBLE
  return (
    <div className={`flex shrink-0 items-center gap-[10px] rounded-lg border border-hc-n-200 px-2 leading-[normal] ${escritorio ? 'py-[5px]' : 'py-1'}`}>
      <BotonCantidad icono={ICONOS_CHECKOUT.cantidadMenos} etiqueta={t('cart.menosUno', { nombre: item.nombre })} onClick={() => onCantidad(item, item.cantidad - 1)} />
      <span aria-live="polite" className="text-[13px] font-semibold text-hc-n-900">{item.cantidad}</span>
      <BotonCantidad icono={ICONOS_CHECKOUT.cantidadMas} etiqueta={t('cart.masUno', { nombre: item.nombre })} deshabilitado={item.cantidad >= stockMax} onClick={() => onCantidad(item, item.cantidad + 1)} />
    </div>
  )
}

function Foto({ item, tamano }: { item: ItemCarrito; tamano: string }) {
  const imagen = imagenItemCarrito(item)
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-hc-n-100 ${tamano}`}>
      {imagen ? <img src={imagen} alt="" className="size-full object-cover" /> : <PackagePlaceholder />}
    </div>
  )
}

/** Notas e imágenes de referencia de un producto personalizado (no aparecen en Figma; se conservan por función). */
function DetallePersonalizado({ item }: { item: ItemCarrito }) {
  const { t } = useTranslation()
  if (!item.personalizacion) return null
  const referencias = item.personalizacion.imagenes?.filter(Boolean) ?? []
  return (
    <>
      <p className="text-[11px] font-semibold leading-[normal] text-hc-n-500">{t('cart.personalizado')}</p>
      {referencias.length > 0 && (
        <div className="flex gap-1">
          {referencias.slice(0, 3).map((url) => <img key={url} src={url} alt="" className="size-8 rounded-md border border-hc-n-200 object-cover" />)}
        </div>
      )}
      {item.personalizacion.notas && <p className="line-clamp-2 text-[11px] leading-[15px] text-hc-n-500">{item.personalizacion.notas}</p>}
    </>
  )
}

/** Producto de un paquete: Figma `37:1528` (móvil) y `38:1373` (escritorio). */
export default function FilaProductoCarrito({ item, escritorio, onCantidad, onQuitar, onMoverAFavoritos }: FilaProductoCarritoProps) {
  const { t } = useTranslation()

  if (escritorio) {
    return (
      <div className="flex items-center gap-4 border-t border-hc-n-200 px-[18px] py-[14px]">
        <Foto item={item} tamano="size-[72px]" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 leading-[normal]">
          <p className="max-w-full truncate text-[15px] font-medium text-hc-n-900">{item.nombre}</p>
          <div className="flex items-center gap-[14px] text-[12px] font-semibold">
            <button type="button" onClick={() => onMoverAFavoritos(item)} className="text-hc-blue-600">{t('cart.moverFavoritos')}</button>
            <button type="button" onClick={() => onQuitar(item)} aria-label={t('cart.quitar', { nombre: item.nombre })} className="text-hc-n-600">{t('cart.remove')}</button>
          </div>
          <DetallePersonalizado item={item} />
        </div>
        <Cantidad item={item} escritorio onCantidad={onCantidad} />
        <p className="shrink-0 font-display text-[17px] font-bold leading-[normal] text-hc-n-900">{formatPrice(subtotalItem(item))}</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <Foto item={item} tamano="size-[60px]" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px]">
        <p className="w-full text-[14px] font-medium leading-[18px] text-hc-n-900">{item.nombre}</p>
        <p className="font-display text-[15px] font-bold leading-[normal] text-hc-n-900">{formatPrice(subtotalItem(item))}</p>
        <div className="flex items-center gap-3">
          <Cantidad item={item} escritorio={false} onCantidad={onCantidad} />
          <button type="button" onClick={() => onQuitar(item)} aria-label={t('cart.quitar', { nombre: item.nombre })} className="relative flex size-4 items-center justify-center text-hc-n-500 after:absolute after:-inset-3">
            <IconoFigma src={ICONOS_CHECKOUT.eliminar} size={16} />
          </button>
        </div>
        <DetallePersonalizado item={item} />
      </div>
    </div>
  )
}
