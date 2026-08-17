/** Debounce de búsqueda de cliente y producto (ms). */
export const DEBOUNCE_MS = 350

/** Etiquetas del wizard de asignación. */
export const PASOS = ['Cliente', 'Productos', 'Confirmar']

/** Métodos de pago para una compra registrada desde admin. */
export const METODOS_PAGO = ['EXTERNO', 'SINPE', 'EFECTIVO', 'TRANSFERENCIA', 'CONTRA_ENTREGA']

/** Formulario vacío para crear un cliente. */
export const FORM_CLIENTE_VACIO = { nombre: '', apellido: '', correo: '', telefono: '' }

/** Campos del formulario de cliente nuevo. */
export const CAMPOS_NUEVO_CLIENTE = [
  { key: 'nombre', label: 'Nombre *', placeholder: 'Juan', type: 'text' },
  { key: 'apellido', label: 'Apellido', placeholder: 'Pérez', type: 'text' },
  { key: 'correo', label: 'Correo', placeholder: 'juan@ejemplo.com', type: 'email' },
  { key: 'telefono', label: 'Teléfono', placeholder: '88887777', type: 'tel' },
]

/** Tabs buscar / crear del paso cliente. */
export const TABS_CLIENTE = [
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
 * @param {unknown} data
 * @returns {object[]}
 */
export function clientesDesdeRespuesta(data) {
  return Array.isArray(data?.data) ? data.data : []
}

/**
 * Lista de productos desde getAll (ya normalizado).
 * @param {unknown} data
 * @returns {object[]}
 */
export function productosDesdeRespuesta(data) {
  const lista = data?.content ?? data
  return Array.isArray(lista) ? lista : []
}

/**
 * Ítem de compra a partir de un producto del catálogo.
 * @param {{ id: number, nombre: string, imagenUrl?: string, precioVenta?: number }} prod
 */
export function itemDesdeProducto(prod) {
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
 * @param {{ cantidad: number, precioUnitario: number }[]} items
 * @returns {number}
 */
export function totalItems(items) {
  return items.reduce((suma, item) => suma + item.cantidad * item.precioUnitario, 0)
}

/**
 * Estilo del círculo de un paso del wizard.
 * @param {boolean} done
 * @param {boolean} active
 * @returns {{ backgroundColor: string, color: string, border: string }}
 */
export function estiloCirculoPaso(done, active) {
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
