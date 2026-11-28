import { create } from 'zustand'

/**
 * Datos del pedido que se capturan en el carrito y se consumen en el checkout:
 * notas para la tienda (Figma `51:1820`).
 * Solo memoria: no se persisten entre recargas, igual que el estado local del checkout original.
 */
type PedidoExtrasState = {
  notas: string
  setNotas: (notas: string) => void
  reiniciar: () => void
}

const INICIAL = {
  notas: '',
}

const usePedidoExtrasStore = create<PedidoExtrasState>((set) => ({
  ...INICIAL,
  setNotas: (notas) => set({ notas }),
  reiniciar: () => set({ ...INICIAL }),
}))

export default usePedidoExtrasStore
