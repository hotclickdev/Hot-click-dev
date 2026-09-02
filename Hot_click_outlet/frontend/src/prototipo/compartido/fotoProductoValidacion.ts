export const MAX_BYTES_FOTO_PRODUCTO = 10 * 1024 * 1024
export const ACCEPT_FOTO_PRODUCTO = 'image/jpeg,image/png,image/webp,image/gif'

const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function errorValidacionFoto(file: File): string | null {
  if (file.type && !TIPOS_FOTO.has(file.type) && !file.type.startsWith('image/')) {
    return 'La foto tiene que ser JPG, PNG, WebP o GIF.'
  }
  if (file.size > MAX_BYTES_FOTO_PRODUCTO) return 'La foto no puede superar 10 MB.'
  return null
}

export function urlDesdeUpload(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const cuerpo = data as { data?: { url?: unknown }; url?: unknown }
  if (typeof cuerpo.data?.url === 'string') return cuerpo.data.url
  if (typeof cuerpo.url === 'string') return cuerpo.url
  return ''
}
