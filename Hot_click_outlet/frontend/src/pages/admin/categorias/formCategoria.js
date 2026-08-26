export const FORMULARIO_CATEGORIA_VACIO = {
  nombreCategoria: '',
  descripcion: '',
  padreId: '',
  icono: '',
}

export const COLUMNAS_EXPORT_CATEGORIAS = ['id', 'nombreCategoria', 'descripcion', 'padreId', 'padreNombre']
export const COLUMNAS_IMPORT_CATEGORIAS = ['nombreCategoria', 'descripcion', 'padreId']
export const NOMBRE_ARCHIVO_CATEGORIAS = 'categorias'
export const NOMBRE_HOJA_CATEGORIAS = 'Categorías'

export { ICONOS_CATEGORIA, etiquetaIconoCategoria, iconoCategoriaEsItem } from '@/pages/catalogo/categoriaIconos'

/** @param {unknown} data */
export function listaCategoriasDesdeRespuesta(data) {
  return Array.isArray(data) ? data : []
}

/** @param {{ nombreCategoria?: string, descripcion?: string, padreId?: string|number, icono?: string }} categoria */
export function formularioDesdeCategoria(categoria) {
  return {
    nombreCategoria: categoria.nombreCategoria ?? '',
    descripcion: categoria.descripcion ?? '',
    padreId: categoria.padreId ? String(categoria.padreId) : '',
    icono: categoria.icono ?? '',
  }
}

/** @param {string|number} [padreId] */
export function formularioNuevaCategoria(padreId = '') {
  return {
    ...FORMULARIO_CATEGORIA_VACIO,
    padreId: padreId ? String(padreId) : '',
  }
}

/**
 * @param {{ id: number, padreId?: number }[]} categorias
 * @returns {Array}
 */
export function armarArbolCategorias(categorias) {
  const porId = {}
  categorias.forEach((categoria) => {
    porId[categoria.id] = { ...categoria, children: [] }
  })
  const raices = []
  categorias.forEach((categoria) => {
    if (categoria.padreId && porId[categoria.padreId]) {
      porId[categoria.padreId].children.push(porId[categoria.id])
      return
    }
    raices.push(porId[categoria.id])
  })
  return raices
}

/** @param {{ id: number, padreId?: number }[]} categorias */
export function idsDescendientes(categorias, idRaiz) {
  const ids = new Set()
  function recoger(id) {
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
 * @param {{ id: number, padreId?: number }[]} categorias
 */
export function opcionesPadre(categorias, editing) {
  if (!editing) return categorias
  const bloqueados = idsDescendientes(categorias, editing.id)
  return categorias.filter((categoria) => !bloqueados.has(String(categoria.id)))
}

/** @param {{ id: number, nombreCategoria?: string, nombre?: string, padreId?: number }} categoria */
export function etiquetaOpcionPadre(categoria, categorias) {
  const nombre = categoria.nombreCategoria ?? categoria.nombre
  if (!categoria.padreId) return nombre
  const padre = categorias.find((item) => String(item.id) === String(categoria.padreId))
  const nombrePadre = padre ? (padre.nombreCategoria ?? padre.nombre) : ''
  if (!nombrePadre) return nombre
  return `${nombre} (en ${nombrePadre})`
}

/** @param {{ padreId?: number }[]} categorias */
export function etiquetaConteoCategorias(categorias) {
  const grupos = categorias.filter((categoria) => !categoria.padreId).length
  const subs = categorias.filter((categoria) => categoria.padreId).length
  return `${grupos} grupos • ${subs} subcategorías`
}

/** @param {{ id: number, nombreCategoria: string, descripcion?: string, padreId?: number, padreNombre?: string }[]} categorias */
export function filasExportacionCategorias(categorias) {
  return categorias.map((categoria) => ({
    id: categoria.id,
    nombreCategoria: categoria.nombreCategoria,
    descripcion: categoria.descripcion ?? '',
    padreId: categoria.padreId ?? '',
    padreNombre: categoria.padreNombre ?? '',
  }))
}

/** @param {{ nombreCategoria?: string, descripcion?: string, padreId?: string }} fila */
export function filaImportacionCategoria(fila) {
  return {
    nombreCategoria: fila.nombreCategoria ?? '',
    descripcion: fila.descripcion ?? '',
    padreId: fila.padreId ?? '',
  }
}

/** @param {string} [nombre] */
export function inicialDeCategoria(nombre) {
  return (nombre ?? '').charAt(0).toUpperCase()
}

export function etiquetaBotonGuardarCategoria(estaEditando, padreId) {
  if (estaEditando) return 'Guardar cambios'
  if (padreId) return 'Crear subcategoría'
  return 'Crear grupo'
}

/** @param {{ response?: { data?: { message?: string } } }} error */
export function mensajeErrorCategoria(error, fallback) {
  return error.response?.data?.message ?? fallback
}
