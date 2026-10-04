export const BYTES_MIN_COMPRIMIR = 200_000
export const LADO_MAX_FOTO = 1600
export const CALIDAD_JPEG = 0.82

/** Achica fotos grandes en el cliente antes de subirlas. Si no se puede, deja el archivo. */
export async function comprimirFotoProducto(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < BYTES_MIN_COMPRIMIR) return file
  if (typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const { ancho, alto } = ladoComprimido(bitmap.width, bitmap.height, LADO_MAX_FOTO)
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', CALIDAD_JPEG)
    })
    if (!blob || blob.size >= file.size) return file
    return new File([blob], nombreJpeg(file.name), { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export function ladoComprimido(ancho: number, alto: number, max: number): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= max) return { ancho, alto }
  const escala = max / mayor
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

function nombreJpeg(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, '')
  return `${base || 'foto'}.jpg`
}
