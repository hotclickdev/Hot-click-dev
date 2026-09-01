import { productService } from '@/services/productService'

export function urlDesdeUpload(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const cuerpo = data as { data?: { url?: unknown }; url?: unknown }
  if (typeof cuerpo.data?.url === 'string') return cuerpo.data.url
  if (typeof cuerpo.url === 'string') return cuerpo.url
  return ''
}

export function errorValidacionFoto(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'La foto tiene que ser JPG o PNG.'
  if (file.size > 5 * 1024 * 1024) return 'La foto no puede superar 5 MB.'
  return null
}

export async function subirFotoProducto(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await productService.uploadImage(fd)
  return urlDesdeUpload(res.data)
}
