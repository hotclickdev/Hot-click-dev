import HojaInferior from '@/components/comprador/HojaInferior'
import { BotonPago } from '@/pages/pago/PiezasPago'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

export type ItemCarritoRecuperable = {
  productoId?: Id
  nombre?: string
  precio?: number
  imagenUrl?: string
  stock?: number
  cantidad?: number
}

export type CarritoRecuperable = {
  id?: Id
  items?: ItemCarritoRecuperable[]
}

type CartModalProps = {
  open: boolean
  cart: CarritoRecuperable | null
  addItem: (product: Producto, qty?: number) => void
  onClose: () => void
  onDone: () => void
}

/** Recuperar el carrito guardado al iniciar sesión (derivado de Figma `29:2036`, en hoja inferior `45:1612`). */
export default function CartModal({ open, cart, addItem, onClose, onDone }: CartModalProps) {
  const restore = async () => {
    cart?.items?.forEach((item) =>
      addItem({ id: item.productoId, nombre: item.nombre, precio: item.precio,
                imagenUrl: item.imagenUrl, stock: item.stock ?? item.cantidad ?? 1 } as Producto, item.cantidad ?? 1)
    )
    try {
      const { abandonedCartService: svc } = await import('@/services/abandonedCartService')
      await svc.deleteAbandonedCart(cart?.id as Id)
    } catch { /* ok */ }
    onClose(); onDone()
  }
  const discard = async () => {
    try {
      const { abandonedCartService: svc } = await import('@/services/abandonedCartService')
      await svc.deleteAbandonedCart(cart?.id as Id)
    } catch { /* ok */ }
    onClose(); onDone()
  }
  const items = cart?.items ?? []
  return (
    // Sin cierre libre, como antes: el comprador elige restaurar o descartar.
    <HojaInferior abierta={open} onCerrar={() => {}} titulo={<h2 className="font-display text-[19px] font-bold tracking-normal text-hc-n-900">¡Tenés productos guardados!</h2>}>
      <div className="flex flex-col gap-3 leading-[normal]">
        <p className="text-[14px] leading-5 text-hc-n-600">
          Dejaste {items.length} producto(s) en tu carrito antes. ¿Querés restaurarlos?
        </p>
        <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
          {items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-[10px] border-t border-hc-n-200 px-[14px] py-[10px] first:border-t-0">
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-hc-n-100">
                {item.imagenUrl && <img src={item.imagenUrl} alt="" width={44} height={44} className="size-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-hc-n-900">{item.nombre}</span>
              <span className="shrink-0 text-[13px] text-hc-n-600">×{item.cantidad ?? 1}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="border-t border-hc-n-200 px-[14px] py-[10px] text-[12px] text-hc-n-600">y {items.length - 3} más…</p>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <BotonPago variante="primario" onClick={() => { void restore() }}>Restaurar carrito</BotonPago>
          <BotonPago variante="secundario" onClick={() => { void discard() }}>Descartar</BotonPago>
        </div>
      </div>
    </HojaInferior>
  )
}
