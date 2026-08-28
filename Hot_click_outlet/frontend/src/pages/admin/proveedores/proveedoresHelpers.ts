import type { Id } from '@/types/api'

export type ProveedorForm = {
  nombre: string
  contacto: string
  telefono: string
  correo: string
  notas: string
  tipo: string
}

export const EMPTY_PROVEEDOR: ProveedorForm = { nombre: '', contacto: '', telefono: '', correo: '', notas: '', tipo: 'PRODUCTO_TERMINADO' }

export type ProveedorAdmin = {
  id: Id
  nombre: string
  contacto?: string | null
  telefono?: string | null
  correo?: string | null
  notas?: string | null
  tipo?: string | null
}

export type CostoHistorial = {
  producto?: string
  numeroOrden?: string
  estadoOrden?: string
  fechaOrden?: string
  precioUnitario?: number
  cantidad?: number
}

export type ToastProveedor = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
