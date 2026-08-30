import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

/** Debounce de búsqueda de cliente y producto (ms). */
export const DEBOUNCE_MS = 350

/** Etiquetas del wizard de asignación. */
export const PASOS = ['Cliente', 'Productos', 'Confirmar']

/** Métodos de pago para una compra registrada desde admin. */
export const METODOS_PAGO = ['EXTERNO', 'SINPE', 'EFECTIVO', 'TRANSFERENCIA', 'CONTRA_ENTREGA']

export type TabCliente = 'buscar' | 'crear'

export type FormCliente = {
  nombre: string
  apellido: string
  correo: string
  telefono: string
}

export type ClienteAsignar = {
  id?: Id
  nombre?: string
  apellidoPaterno?: string
  correo?: string
  telefono?: string
}

export type ItemAsignar = {
  productoId: Producto['id']
  nombre: string
  imagenUrl?: string
  cantidad: number
  precioUnitario: number
}

export type CampoNuevoCliente = {
  key: keyof FormCliente
  label: string
  placeholder: string
  type: string
}

/** Formulario vacío para crear un cliente. */
export const FORM_CLIENTE_VACIO: FormCliente = { nombre: '', apellido: '', correo: '', telefono: '' }

/** Campos del formulario de cliente nuevo. */
export const CAMPOS_NUEVO_CLIENTE: CampoNuevoCliente[] = [
  { key: 'nombre', label: 'Nombre *', placeholder: 'Juan', type: 'text' },
  { key: 'apellido', label: 'Apellido', placeholder: 'Pérez', type: 'text' },
  { key: 'correo', label: 'Correo', placeholder: 'juan@ejemplo.com', type: 'email' },
  { key: 'telefono', label: 'Teléfono', placeholder: '88887777', type: 'tel' },
]

/** Tabs buscar / crear del paso cliente. */
export const TABS_CLIENTE: [TabCliente, string][] = [
  ['buscar', 'Buscar cliente existente'],
  ['crear', 'Crear cliente nuevo'],
]

/** Estilo de inputs del wizard. */
export const ESTILO_INPUT = {
  backgroundColor: 'var(--hc-surface-2)',
  border: '1px solid var(--hc-border)',
  color: 'var(--hc-text)',
}

/**
 * Lista de clientes desde la respuesta de buscarCliente.
 */
export function clientesDesdeRespuesta(data: unknown): ClienteAsignar[] {
  if (typeof data !== 'object' || data === null) return []
  const inner = (data as { data?: unknown }).data
  return Array.isArray(inner) ? inner as ClienteAsignar[] : []
}

/**
 * Lista de productos desde getAll (ya normalizado).
 */
export function productosDesdeRespuesta(data: unknown): Producto[] {
  const content = typeof data === 'object' && data !== null
    ? (data as { content?: unknown }).content
    : undefined
  const lista = content ?? data
  return Array.isArray(lista) ? lista as Producto[] : []
}

/**
 * Ítem de compra a partir de un producto del catálogo.
 */
export function itemDesdeProducto(prod: Producto): ItemAsignar {
  return {
    productoId: prod.id,
    nombre: prod.nombre,
    imagenUrl: prod.imagenUrl,
    cantidad: 1,
    precioUnitario: prod.precioVenta ?? 0,
  }
}

/**
 * Suma cantidad × precioUnitario de los ítems.
 */
export function totalItems(items: Pick<ItemAsignar, 'cantidad' | 'precioUnitario'>[]): number {
  return items.reduce((suma, item) => suma + item.cantidad * item.precioUnitario, 0)
}

/**
 * Estilo del círculo de un paso del wizard.
 */
export function estiloCirculoPaso(done: boolean, active: boolean): {
  backgroundColor: string
  color: string
  border: string
} {
  if (done) {
    return {
      backgroundColor: 'rgba(16,185,129,0.15)',
      color: '#10b981',
      border: '1px solid rgba(16,185,129,0.3)',
    }
  }
  if (active) {
    return {
      backgroundColor: 'var(--hc-accent)',
      color: '#fff',
      border: '1px solid var(--hc-accent)',
    }
  }
  return {
    backgroundColor: 'var(--hc-surface-2)',
    color: 'var(--hc-muted)',
    border: '1px solid var(--hc-border)',
  }
}

export function clienteDesdeCrear(data: unknown): ClienteAsignar {
  if (typeof data === 'object' && data !== null && 'data' in data) {
    const nested = (data as { data?: unknown }).data
    if (nested != null) return nested as ClienteAsignar
  }
  return data as ClienteAsignar
}

export function mensajeErrorAsignar(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' && message ? message : fallback
}
