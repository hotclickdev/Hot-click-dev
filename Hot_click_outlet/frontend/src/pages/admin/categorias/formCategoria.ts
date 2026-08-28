import type { Id } from '@/types/api'

export const FORMULARIO_CATEGORIA_VACIO = {
  nombreCategoria: '',
  descripcion: '',
  padreId: '',
  icono: '',
}

export type FormularioCategoria = typeof FORMULARIO_CATEGORIA_VACIO

export type CategoriaAdmin = {
  id: Id
  nombreCategoria?: string
  descripcion?: string
  padreId?: Id | null
  padreNombre?: string
  icono?: string
  nombre?: string
}

type CategoriaEtiqueta = {
  id?: Id
  nombreCategoria?: string
  nombre?: string
  padreId?: Id | null
}

export type CategoriaNodo = CategoriaAdmin & { children: CategoriaNodo[] }

export type DeleteTargetCategoria = { id: Id; nombre: string }

export const COLUMNAS_EXPORT_CATEGORIAS = ['id', 'nombreCategoria', 'descripcion', 'padreId', 'padreNombre']
export const COLUMNAS_IMPORT_CATEGORIAS = ['nombreCategoria', 'descripcion', 'padreId']
export const NOMBRE_ARCHIVO_CATEGORIAS = 'categorias'
export const NOMBRE_HOJA_CATEGORIAS = 'Categorías'

export { ICONOS_CATEGORIA, etiquetaIconoCategoria, iconoCategoriaEsItem } from '@/pages/catalogo/categoriaIconos'

export function listaCategoriasDesdeRespuesta(data: unknown): CategoriaAdmin[] {
  return Array.isArray(data) ? data as CategoriaAdmin[] : []
}

export function formularioDesdeCategoria(categoria: Pick<CategoriaAdmin, 'nombreCategoria' | 'descripcion' | 'padreId' | 'icono'>): FormularioCategoria {
  return {
    nombreCategoria: categoria.nombreCategoria ?? '',
    descripcion: categoria.descripcion ?? '',
    padreId: categoria.padreId ? String(categoria.padreId) : '',
    icono: categoria.icono ?? '',
  }
}

export function formularioNuevaCategoria(padreId: Id | '' = ''): FormularioCategoria {
  return {
    ...FORMULARIO_CATEGORIA_VACIO,
    padreId: padreId ? String(padreId) : '',
  }
}

export function armarArbolCategorias(categorias: CategoriaAdmin[]): CategoriaNodo[] {
  const porId: Record<string, CategoriaNodo> = {}
  categorias.forEach((categoria) => {
    porId[String(categoria.id)] = { ...categoria, children: [] }
  })
  const raices: CategoriaNodo[] = []
  categorias.forEach((categoria) => {
    if (categoria.padreId && porId[String(categoria.padreId)]) {
      porId[String(categoria.padreId)].children.push(porId[String(categoria.id)])
      return
    }
    raices.push(porId[String(categoria.id)])
  })
  return raices
}

export function idsDescendientes(categorias: CategoriaAdmin[], idRaiz: Id) {
  const ids = new Set<string>()
  function recoger(id: Id) {
    ids.add(String(id))
    categorias
      .filter((categoria) => String(categoria.padreId) === String(id))
      .forEach((categoria) => recoger(categoria.id))
  }
  recoger(idRaiz)
  return ids
}

/**
 * Evita elegir como padre a la categoría editada o a sus hijas (ciclo).
 */
export function opcionesPadre(categorias: CategoriaAdmin[], editing: CategoriaAdmin | null) {
  if (!editing) return categorias
  const bloqueados = idsDescendientes(categorias, editing.id)
  return categorias.filter((categoria) => !bloqueados.has(String(categoria.id)))
}

export function etiquetaOpcionPadre(categoria: CategoriaEtiqueta, categorias: CategoriaEtiqueta[]) {
  const nombre = categoria.nombreCategoria ?? categoria.nombre
  if (!categoria.padreId) return nombre
  const padre = categorias.find((item) => String(item.id) === String(categoria.padreId))
  const nombrePadre = padre ? (padre.nombreCategoria ?? padre.nombre) : ''
  if (!nombrePadre) return nombre
  return `${nombre} (en ${nombrePadre})`
}

export function etiquetaConteoCategorias(categorias: CategoriaAdmin[]) {
  const grupos = categorias.filter((categoria) => !categoria.padreId).length
  const subs = categorias.filter((categoria) => categoria.padreId).length
  return `${grupos} grupos • ${subs} subcategorías`
}

export function filasExportacionCategorias(categorias: CategoriaAdmin[]) {
  return categorias.map((categoria) => ({
    id: categoria.id,
    nombreCategoria: categoria.nombreCategoria,
    descripcion: categoria.descripcion ?? '',
    padreId: categoria.padreId ?? '',
    padreNombre: categoria.padreNombre ?? '',
  }))
}

export function filaImportacionCategoria(fila: { nombreCategoria?: unknown; descripcion?: unknown; padreId?: unknown }) {
  return {
    nombreCategoria: fila.nombreCategoria ?? '',
    descripcion: fila.descripcion ?? '',
    padreId: fila.padreId ?? '',
  }
}

export function inicialDeCategoria(nombre?: string) {
  return (nombre ?? '').charAt(0).toUpperCase()
}

export function etiquetaBotonGuardarCategoria(estaEditando: boolean, padreId: string) {
  if (estaEditando) return 'Guardar cambios'
  if (padreId) return 'Crear subcategoría'
  return 'Crear grupo'
}

export function mensajeErrorCategoria(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}
