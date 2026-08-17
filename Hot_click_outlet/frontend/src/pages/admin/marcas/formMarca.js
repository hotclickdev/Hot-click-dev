export const FORMULARIO_MARCA_VACIO = { nombreMarca: '', logoUrl: '' }

export const COLUMNAS_EXPORT_MARCAS = ['id', 'nombreMarca', 'logoUrl']
export const COLUMNAS_IMPORT_MARCAS = ['nombreMarca', 'logoUrl']
export const NOMBRE_ARCHIVO_MARCAS = 'marcas'
export const NOMBRE_HOJA_MARCAS = 'Marcas'

/** @param {unknown} data */
export function listaMarcasDesdeRespuesta(data) {
  return Array.isArray(data) ? data : []
}

/** @param {{ nombreMarca?: string, logoUrl?: string }} marca */
export function formularioDesdeMarca(marca) {
  return {
    nombreMarca: marca.nombreMarca ?? '',
    logoUrl: marca.logoUrl ?? '',
  }
}

/** @param {string} nombre */
export function nombreMarcaEsValido(nombre) {
  return Boolean(nombre?.trim())
}

/** @param {{ data?: { url?: string } | string }} respuesta */
export function urlLogoDesdeRespuesta(respuesta) {
  return respuesta.data?.url ?? respuesta.data
}

/** @param {{ id: number, nombreMarca: string, logoUrl?: string }[]} marcas */
export function filasExportacionMarcas(marcas) {
  return marcas.map((marca) => ({
    id: marca.id,
    nombreMarca: marca.nombreMarca,
    logoUrl: marca.logoUrl ?? '',
  }))
}

/** @param {{ nombreMarca?: string, logoUrl?: string }} fila */
export function filaImportacionMarca(fila) {
  return {
    nombreMarca: fila.nombreMarca ?? '',
    logoUrl: fila.logoUrl ?? '',
  }
}

/** @param {string} [nombre] */
export function inicialDeMarca(nombre) {
  return (nombre ?? '').charAt(0).toUpperCase()
}

/** @param {number} cantidad */
export function etiquetaConteoMarcas(cantidad) {
  const plural = cantidad === 1 ? '' : 's'
  return `${cantidad} marca${plural} registrada${plural}`
}

/** @param {{ response?: { data?: { message?: string } } }} error */
export function mensajeErrorMarca(error, fallback) {
  return error.response?.data?.message ?? fallback
}
