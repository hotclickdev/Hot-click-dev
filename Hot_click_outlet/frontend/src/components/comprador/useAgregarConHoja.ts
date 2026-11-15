import useCartStore from '@/store/cartStore'
import { avisarSiTopeCarrito } from '@/store/avisarTopeCarrito'
import { useToast } from '@/components/ui/Toast'
import useHojaAgregadoStore from '@/store/hojaAgregadoStore'
import { tienePaqueteDe } from '@/pages/checkout/paquetesCompra'
import type { Producto } from '@/types/producto'

/** Agrega al carrito y abre la hoja «Agregado a tu pedido» con el paquete al que entró. */
export function useAgregarConHoja() {
  const addItem = useCartStore((s) => s.addItem)
  const mostrar = useHojaAgregadoStore((s) => s.mostrar)
  const toast = useToast()

  return (producto: Producto, cantidad = 1) => {
    const mismoPaquete = tienePaqueteDe(useCartStore.getState().items, producto)
    if (!avisarSiTopeCarrito(addItem(producto, cantidad), (m) => toast({ message: m, type: 'error' }))) return
    mostrar({ producto, cantidad, mismoPaquete })
  }
}
