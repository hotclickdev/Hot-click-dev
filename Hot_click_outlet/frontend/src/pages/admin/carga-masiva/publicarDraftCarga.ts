import { productService } from '@/services/productService'
import {
  idDesdeProductoCreado,
  urlDesdeUpload,
  type ProductoDraft,
} from './cargaMasivaHelpers'

export async function publicarDraftCarga(
  d: ProductoDraft,
  empresaParam: number | undefined,
  onGaleriaError: (err: unknown) => void,
) {
  const mainUrl = await subirImagenCarga(d.mainFile)
  const extraUrls: string[] = []
  for (const f of d.extraFiles) {
    const url = await subirImagenCarga(f)
    if (url) extraUrls.push(url)
  }
  const res = await productService.create(
    payloadDeDraft(d, mainUrl),
    empresaParam != null ? { params: { empresaId: empresaParam } } : {},
  )
  const productId = idDesdeProductoCreado(res.data)
  if (!productId || extraUrls.length === 0) return
  await productService.sincronizarImagenes(productId, [mainUrl, ...extraUrls].filter(Boolean))
    .catch(onGaleriaError)
}

async function subirImagenCarga(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await productService.uploadImage(fd)
  return urlDesdeUpload(r.data)
}

function payloadDeDraft(d: ProductoDraft, mainUrl: string) {
  return {
    nombreProducto: d.nombre.trim(),
    precioVenta: Number(d.precioVenta) || 0,
    precioCompra: Number(d.precioCompra) || 0,
    stockActual: Number(d.stock) || 1,
    categoriaId: d.categoriaId ? Number(d.categoriaId) : null,
    imagenPrincipalUrl: mainUrl || null,
    condicion: 'NUEVO',
    visibleCatalogo: true,
  }
}
