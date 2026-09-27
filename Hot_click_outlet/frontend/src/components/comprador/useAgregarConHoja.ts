import useCartStore from '@/store/cartStore'
import useHojaAgregadoStore from '@/store/hojaAgregadoStore'
import { tienePaqueteDe } from '@/pages/checkout/paquetesCompra'
import type { Producto } from '@/types/producto'

/** Agrega al carrito y abre la hoja «Agregado a tu pedido» con el paquete al que entró. */
export function useAgregarConHoja() {
  const addItem = useCartStore((s) => s.addItem)
  const mostrar = useHojaAgregadoStore((s) => s.mostrar)

  return (producto: Producto, cantidad = 1) => {
    const mismoPaquete = tienePaqueteDe(useCartStore.getState().items, producto)
    addItem(producto, cantidad)
    mostrar({ producto, cantidad, mismoPaquete })
  }
}
