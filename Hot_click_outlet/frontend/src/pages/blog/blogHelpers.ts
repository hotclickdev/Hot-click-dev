import { fechaConMes } from '../servicios/serviciosHelpers'

export type EntradaBlog = {
  id?: number | string
  slug?: string
  titulo?: string
  resumen?: string
  imagenUrl?: string | null
  fechaPublicacion?: string | null
  fechaCreacion?: string | null
  contenido?: string
}

/** Palabras que una persona lee por minuto: base del "N min de lectura". */
const PALABRAS_POR_MINUTO = 200

/** Minutos de lectura según el contenido HTML del artículo; `null` si el listado no trae el contenido. */
export function minutosDeLectura(contenido: string | undefined): number | null {
  if (!contenido) return null
  const texto = contenido.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
  const palabras = texto.split(/\s+/).filter(Boolean).length
  return palabras === 0 ? null : Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO))
}

export function fechaEntrada(e: EntradaBlog): string {
  return fechaConMes(e.fechaPublicacion || e.fechaCreacion || undefined)
}

/** "12 sep 2026 · 4 min de lectura": fecha y, si hay contenido, el tiempo de lectura (Figma `54:2165`). */
export function metaEntrada(e: EntradaBlog, sufijoLectura = 'de lectura'): string {
  const minutos = minutosDeLectura(e.contenido)
  return [fechaEntrada(e), minutos ? `${minutos} min${sufijoLectura ? ` ${sufijoLectura}` : ''}` : ''].filter(Boolean).join(' · ')
}

/** El interceptor de axios ya quita el sobre `{ success, data }`: la lista llega directa o, sin sobre, dentro de `data`. */
export function listaEntradas(data: unknown): EntradaBlog[] {
  if (Array.isArray(data)) return data as EntradaBlog[]
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner as EntradaBlog[]
  }
  return []
}

/** Una entrada: directa (sin sobre) o dentro de `data`. */
export function entradaDeRespuesta(data: unknown): EntradaBlog | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  if ('data' in data) {
    const inner = (data as { data: unknown }).data
    return inner && typeof inner === 'object' && !Array.isArray(inner) ? (inner as EntradaBlog) : null
  }
  return data as EntradaBlog
}

export function urlEntrada(e: EntradaBlog): string {
  return `/blog/${e.slug || e.id}`
}

/** Enlaces para compartir un artículo (Figma `54:2286`). */
export function enlacesCompartir(url: string, titulo: string): { whatsapp: string; facebook: string } {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  }
}
