import type { Id } from '@/types/api'
import type { Dispatch, SetStateAction } from 'react'

export type ProductoSelfCheckout = {
  id?: Id
  imagenUrl?: string
  nombre?: string
  descripcion?: string
  precio?: number
}

export type MesaSelfCheckout = {
  logoUrl?: string | null
  empresaNombre?: string
  mesaNombre?: string
  colorPrimario?: string
}

export type PedidoResultSelfCheckout = {
  numeroPedido?: string
  total?: number
}

export type FormSelfCheckout = {
  clienteNombre: string
  clienteTel: string
  notas: string
}

export type LineaCarritoSelfCheckout = {
  producto: ProductoSelfCheckout
  cantidad: number
}

export type CarritoSelfCheckout = Record<string, LineaCarritoSelfCheckout>

export type SetFormSelfCheckout = Dispatch<SetStateAction<FormSelfCheckout>>
