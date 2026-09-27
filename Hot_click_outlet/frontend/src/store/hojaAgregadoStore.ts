import { create } from 'zustand'
import type { Producto } from '@/types/producto'

export type ProductoAgregado = {
  producto: Producto
  cantidad: number
  /** El carrito ya tenía un paquete de este negocio antes de agregar: no suma otro envío. */
  mismoPaquete: boolean
}

type HojaAgregadoState = {
  agregado: ProductoAgregado | null
  mostrar: (agregado: ProductoAgregado) => void
  cerrar: () => void
}

/** Hoja «Agregado a tu pedido» (Figma `45:1607`); estado transitorio, no se persiste. */
const useHojaAgregadoStore = create<HojaAgregadoState>()((set) => ({
  agregado: null,
  mostrar: (agregado) => set({ agregado }),
  cerrar: () => set({ agregado: null }),
}))

export default useHojaAgregadoStore
