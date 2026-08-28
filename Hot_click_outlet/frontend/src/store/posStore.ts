import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Id } from '@/types/api'

type PosState = {
  bodegaId: Id | null
  bodegaNombre: string | null
  setBodega: (id: Id, nombre: string) => void
  clearBodega: () => void
}

/**
 * Estado de sesión del POS — bodega de operación activa.
 *
 * Usa sessionStorage: sobrevive recargas de página dentro de la misma pestaña
 * pero se resetea al cerrar el browser, forzando la selección al día siguiente.
 */
const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      bodegaId:     null,   // Long — ID de la bodega seleccionada para esta sesión
      bodegaNombre: null,   // String — nombre para mostrar en el header

      setBodega:   (id, nombre) => set({ bodegaId: id, bodegaNombre: nombre }),
      clearBodega: ()           => set({ bodegaId: null, bodegaNombre: null }),
    }),
    {
      name:    'pos-session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

export default usePosStore
