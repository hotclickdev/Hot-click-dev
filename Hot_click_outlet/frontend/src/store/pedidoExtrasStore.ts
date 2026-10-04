import { create } from 'zustand'

/**
 * Datos del pedido que se capturan en el carrito y se consumen en el checkout:
 * notas para la tienda, cupón y gift card (Figma `51:1820`, `28:989`, `29:1344`).
 * Solo memoria: no se persisten entre recargas, igual que el estado local del checkout original.
 */
type PedidoExtrasState = {
  notas: string
  cuponInput: string
  cuponEstado: string
  cuponDescuento: number
  cuponCodigo: string | null
  cuponError: string
  gcInput: string
  gcEstado: string
  gcSaldo: number
  gcCodigo: string | null
  setNotas: (notas: string) => void
  setCuponInput: (valor: string) => void
  setCuponEstado: (estado: string) => void
  setCuponDescuento: (porcentaje: number) => void
  setCuponCodigo: (codigo: string | null) => void
  setCuponError: (error: string) => void
  setGcInput: (valor: string) => void
  setGcEstado: (estado: string) => void
  setGcSaldo: (saldo: number) => void
  setGcCodigo: (codigo: string | null) => void
  reiniciar: () => void
}

const INICIAL = {
  notas: '',
  cuponInput: '',
  cuponEstado: 'idle',
  cuponDescuento: 0,
  cuponCodigo: null as string | null,
  cuponError: '',
  gcInput: '',
  gcEstado: 'idle',
  gcSaldo: 0,
  gcCodigo: null as string | null,
}

const usePedidoExtrasStore = create<PedidoExtrasState>((set) => ({
  ...INICIAL,
  setNotas: (notas) => set({ notas }),
  setCuponInput: (cuponInput) => set({ cuponInput }),
  setCuponEstado: (cuponEstado) => set({ cuponEstado }),
  setCuponDescuento: (cuponDescuento) => set({ cuponDescuento }),
  setCuponCodigo: (cuponCodigo) => set({ cuponCodigo }),
  setCuponError: (cuponError) => set({ cuponError }),
  setGcInput: (gcInput) => set({ gcInput }),
  setGcEstado: (gcEstado) => set({ gcEstado }),
  setGcSaldo: (gcSaldo) => set({ gcSaldo }),
  setGcCodigo: (gcCodigo) => set({ gcCodigo }),
  reiniciar: () => set({ ...INICIAL }),
}))

export default usePedidoExtrasStore
