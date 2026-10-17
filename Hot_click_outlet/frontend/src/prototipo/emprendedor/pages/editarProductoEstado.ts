export type EstadoEditor = 'cargando' | 'error' | 'no-encontrado' | 'listo'

export const TITULO_404 = 'Producto no encontrado'
export const MENSAJE_404 = 'Este producto no existe o no es de tu negocio (error 404). Solo podés editar los productos de tu catálogo.'

/** El editor solo abre productos del listado propio (`/api/productos/admin/todos`, ya filtrado por negocio). */
export function estadoEditor(cargando: boolean, error: string | null, encontrado: boolean): EstadoEditor {
  if (cargando) return 'cargando'
  if (encontrado) return 'listo'
  return error ? 'error' : 'no-encontrado'
}
