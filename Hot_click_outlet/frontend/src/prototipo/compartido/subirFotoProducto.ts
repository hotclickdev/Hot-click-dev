import { productService } from '@/services/productService'
import { urlDesdeUpload } from './fotoProductoValidacion'

export {
  errorValidacionFoto,
  urlDesdeUpload,
  ACCEPT_FOTO_PRODUCTO,
  MAX_BYTES_FOTO_PRODUCTO,
} from './fotoProductoValidacion'

export async function subirFotoProducto(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await productService.uploadImage(fd)
  return urlDesdeUpload(res.data)
}
