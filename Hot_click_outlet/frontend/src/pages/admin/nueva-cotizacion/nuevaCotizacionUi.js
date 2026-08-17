/** Clases Tailwind compartidas de inputs del formulario de cotización. */
export const inputCls = 'w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-[var(--hc-accent)]/30 transition-all'

/** Estilo inline de inputs (colores del tema). */
export const inputStyle = { background: 'var(--hc-bg)', color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }

/** Ítem vacío para filas nuevas del formulario. */
export const ITEM_VACIO = { tipo: 'CATALOGO', productoId: null, codigo: '', nombre: '', descripcion: '', imagenUrl: '', cantidad: 1, unidadMedida: 'UNIDAD', precioUnitario: 0, descuentoPorcentaje: 0 }
