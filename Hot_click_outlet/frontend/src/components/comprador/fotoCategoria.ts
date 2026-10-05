const HOST_S3 = 'https://hotclick-media.s3.us-east-2.amazonaws.com/'
const ANCHO_FOTO_CATEGORIA = 480

export type FotoCategoria = {
  src: string
  /** El host publica CORS. Sin esto el filtro SVG no puede leer el JPEG y el marco queda vacío. */
  crossOrigin?: 'anonymous'
  /** Misma origen o CORS: se puede vaciar el blanco puro. Si no, la foto se muestra entera. */
  filtrable: boolean
}

/** La foto de S3 pasa por el proxy (misma origen). Unsplash ya manda CORS. El resto no se filtra. */
export function fotoCategoria(url: string): FotoCategoria {
  if (url.startsWith(HOST_S3)) {
    const path = url.slice(HOST_S3.length).split(/[?#]/)[0]
    if (path.length > 0 && !path.includes('..') && !path.startsWith('/')) {
      return { src: `/api/img?p=${path}&w=${ANCHO_FOTO_CATEGORIA}&q=82`, filtrable: true }
    }
  }
  if (url.startsWith('https://images.unsplash.com/')) {
    return { src: url, crossOrigin: 'anonymous', filtrable: true }
  }
  return { src: url, filtrable: false }
}
