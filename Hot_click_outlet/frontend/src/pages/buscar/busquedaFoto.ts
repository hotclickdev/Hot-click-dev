export type ResultadoFoto = {
  id: number | string
  nombre: string
  precio: number
  imagenUrl: string | null
  similitud: number
  /** Nombre del negocio, si la respuesta lo trae. */
  tienda: string | null
  categoria: string | null
}

export type RespuestaFoto = {
  /** Categoría detectada en la foto (puede coincidir con la de un resultado). */
  categoriaDetectada: string
  etiquetas: string[]
  productos: ResultadoFoto[]
}

/** Desde este puntaje de similitud el resultado se marca como "Muy parecido". */
export const SIMILITUD_ALTA = 80

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

/** Normaliza la respuesta de POST /public/shopping-assistant/search-by-image. */
export function leerRespuestaFoto(data: unknown): RespuestaFoto {
  const raiz = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const analisis = (raiz.analisis && typeof raiz.analisis === 'object' ? raiz.analisis : {}) as Record<string, unknown>
  const etiquetas = [texto(analisis.etiquetaPrincipal), texto(analisis.categoria)]
    .filter((e, i, arr) => e !== '' && arr.findIndex((x) => x.toLowerCase() === e.toLowerCase()) === i)
  const lista = Array.isArray(raiz.productos) ? raiz.productos : []
  const productos = lista
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object' && (p as Record<string, unknown>).id != null)
    .map((p) => ({
      id: p.id as number | string,
      nombre: texto(p.nombre),
      precio: Number(p.precio) || 0,
      imagenUrl: texto(p.imagenUrl) || null,
      similitud: Number(p.similarity) || 0,
      tienda: texto(p.empresaNombre) || null,
      categoria: texto(p.categoriaNombre) || texto(p.categoria) || null,
    }))
  return { categoriaDetectada: texto(analisis.categoria), etiquetas, productos }
}

export type EtiquetaParecido = 'muyParecido' | 'mismaCategoria' | 'relacionado'

/** Rótulo de cada resultado: muy parecido, de la misma categoría detectada, o relacionado. */
export function etiquetaParecido(producto: ResultadoFoto, categoriaDetectada: string): EtiquetaParecido {
  if (producto.similitud >= SIMILITUD_ALTA) return 'muyParecido'
  const detectada = categoriaDetectada.toLowerCase()
  if (detectada !== '' && producto.categoria?.toLowerCase() === detectada) return 'mismaCategoria'
  return 'relacionado'
}

/** Lo mismo que acepta el backend (ShoppingAssistantImageSearchHandler): JPG, PNG, WebP o GIF de hasta 5 MB. */
export const FOTO_MAX_BYTES = 5 * 1024 * 1024
const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export type ValidacionFoto = 'ok' | 'formato' | 'pesada'

/** Revisa la foto antes de mandarla, para avisar al toque en vez de esperar el 400 del backend. */
export function validarFoto(archivo: { type: string; size: number }): ValidacionFoto {
  if (!FOTO_TIPOS.some((t) => archivo.type.startsWith(t))) return 'formato'
  if (archivo.size > FOTO_MAX_BYTES) return 'pesada'
  return 'ok'
}
