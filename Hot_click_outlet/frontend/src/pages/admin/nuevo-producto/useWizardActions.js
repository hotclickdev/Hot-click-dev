import { publicacionService } from '@/services/publicacionService'
import { productService, denormalizeProduct } from '@/services/productService'
import { KNOWN_TRADEMARKS } from './productFormUi'
import { DRAFT_KEY } from './wizardHelpers'

/**
 * Acciones pesadas del wizard de nuevo producto: análisis IA de fotos y publicación.
 * @param {object} params
 * @param {object} params.form
 * @param {function} params.setForm
 * @param {File[]} params.imagenesFile
 * @param {function} params.toast
 * @param {function} params.setAnalizando
 * @param {function} params.setAnalizandoIdx
 * @param {function} params.setEtiquetas
 * @param {function} params.setFuenteDetalles
 * @param {object[]} params.marcas
 * @param {object[]} params.categories
 * @param {object[]} params.bodegas
 * @param {function} params.setTrademarkWarning
 * @param {function} params.setWizardStep
 * @param {boolean} params.priceWarning
 * @param {function} params.setPriceWarning
 * @param {function} params.setSaving
 * @param {{ current: string }} params.idempotencyKey
 * @param {function} params.setTieneBorrador
 * @param {function} params.setProductoCreado
 * @param {function} params.setDone
 * @returns {{ handleAnalizar: () => Promise<void>, handleSave: () => Promise<void> }}
 */
export function useWizardActions({
  form, setForm, imagenesFile, toast,
  setAnalizando, setAnalizandoIdx, setEtiquetas, setFuenteDetalles,
  marcas, categories, bodegas,
  setTrademarkWarning, setWizardStep,
  priceWarning, setPriceWarning, setSaving,
  idempotencyKey, setTieneBorrador, setProductoCreado, setDone,
}) {
  const handleAnalizar = async () => {
    if (imagenesFile.length === 0) {
      toast({ message: 'Seleccioná al menos una imagen', type: 'error' })
      return
    }
    setAnalizando(true)
    try {
      const fdAnalisis = new FormData()
      imagenesFile.forEach(f => fdAnalisis.append('imagenes', f))

      const uploadPromises = imagenesFile.map((f) => {
        const fd = new FormData()
        fd.append('file', f)
        return productService.uploadImage(fd)
          .then(r => r.data?.data?.url ?? r.data?.url ?? '')
          .catch(() => '')
      })

      const [analyzeRes, ...uploadResults] = await Promise.allSettled([
        publicacionService.detallesProducto(fdAnalisis),
        ...uploadPromises,
      ])

      for (let i = 0; i < imagenesFile.length; i++) setAnalizandoIdx(i)

      const uploadedUrls = uploadResults
        .filter(r => r.status === 'fulfilled' && r.value && typeof r.value === 'string')
        .map(r => r.value)

      const failedCount = imagenesFile.length - uploadedUrls.length
      if (failedCount > 0) {
        toast({ message: `${failedCount} foto${failedCount > 1 ? 's' : ''} no se pudo${failedCount > 1 ? 'ieron' : ''} subir`, type: 'warning' })
      }

      let analysisData = null
      if (analyzeRes.status === 'fulfilled') {
        analysisData = analyzeRes.value.data?.data ?? analyzeRes.value.data
      } else {
        toast({ message: 'Análisis IA no disponible — completá el formulario manualmente', type: 'warning' })
      }

      const d = analysisData ?? {}
      setEtiquetas(d.todasEtiquetas ?? [])
      setFuenteDetalles(d.fuenteDetalles ?? null)

      const marcaDetectada = d.marca ?? ''
      const marcaMatch = marcaDetectada
        ? marcas.find(m => m.nombreMarca.toLowerCase() === marcaDetectada.toLowerCase())
        : null

      const aiEtiquetas = (d.todasEtiquetas ?? []).map(e => e.toLowerCase())
      let categoriaAutoId = ''
      if (categories.length > 0 && aiEtiquetas.length > 0) {
        const catMatch = categories.find(c => {
          const catName = (c.nombreCategoria ?? c.nombre ?? '').toLowerCase()
          return aiEtiquetas.some(tag => catName.includes(tag) || tag.includes(catName))
        })
        if (catMatch) categoriaAutoId = String(catMatch.id)
      }

      const nombreIA = (d.nombre ?? '').slice(0, 80)
      setForm(prev => ({
        ...prev,
        nombre:           nombreIA,
        titulo:           (d.titulo ?? nombreIA).slice(0, 40),
        descripcion:      d.descripcionCorta ?? '',
        descripcionLarga: d.descripcionLarga ?? '',
        especificaciones: d.especificaciones ?? '',
        comoUsar:         d.comoUsar         ?? '',
        marcaId:          marcaMatch ? String(marcaMatch.id) : '',
        precioVenta:      d.precioSugerido > 0 ? String(d.precioSugerido) : '',
        bodegaId:         bodegas[0]?.id ? String(bodegas[0].id) : '',
        talla:            d.talla        ?? '',
        imagenUrl:        uploadedUrls[0] ?? '',
        imagenes:         uploadedUrls,
        categoriaId:      categoriaAutoId,
      }))

      const marcaRaw = (d.marca ?? '').toLowerCase().trim()
      setTrademarkWarning(
        marcaRaw && KNOWN_TRADEMARKS.has(marcaRaw)
          ? `La IA detectó la marca "${d.marca}". Verificá que tenés autorización para revender productos de esta marca.`
          : ''
      )
      setWizardStep(1)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al procesar imágenes', type: 'error' })
    } finally {
      setAnalizando(false)
      setAnalizandoIdx(-1)
    }
  }

  const handleSave = async () => {
    if (!form.categoriaId) {
      toast({ message: 'Seleccioná una categoría', type: 'error' })
      setWizardStep(4)
      return
    }
    if (!form.bodegaId && bodegas.length > 0) {
      toast({ message: 'Seleccioná una bodega', type: 'error' })
      setWizardStep(4)
      return
    }

    const compra = Number(form.precioCompra)
    const venta = Number(form.precioVenta)
    if (compra > 0 && venta > 0 && compra > venta && !priceWarning) {
      setPriceWarning(true)
      toast({ message: `El precio de compra (₡${compra.toLocaleString('es-CR')}) supera al de venta. Corregí los precios o publicá de nuevo para confirmar.`, type: 'warning' })
      return
    }

    setSaving(true)
    try {
      const imagenUrl = form.imagenes[0] ?? form.imagenUrl ?? ''
      const sl = form.seoByLang ?? {}
      const dto = denormalizeProduct({
        ...form, imagenUrl,
        metaTitle:         sl.es?.title       || form.metaTitle        || '',
        metaDescription:   sl.es?.description || form.metaDescription  || '',
        metaKeywords:      form.metaKeywords   || '',
        tags:              form.tags           || '',
        metaTitleEn:       sl.en?.title        || '',
        metaTitlePt:       sl.pt?.title        || '',
        metaTitleFr:       sl.fr?.title        || '',
        metaDescriptionEn: sl.en?.description  || '',
        metaDescriptionPt: sl.pt?.description  || '',
        metaDescriptionFr: sl.fr?.description  || '',
      })
      // 2+ tallas marcadas -> mismo producto en varias filas (una por talla), agrupadas
      // como variantes (mismo mecanismo que ya se usa para colores en el import).
      const paresTalla = (form.tallasCantidad || []).filter(x => x.talla && Number(x.cantidad) > 0)
      let productoId, pendienteAprobacion

      if (paresTalla.length > 1) {
        const grupoVarianteId = crypto.randomUUID()
        for (const par of paresTalla) {
          const dtoTalla = { ...dto, talla: par.talla, stockActual: Number(par.cantidad), grupoVarianteId }
          const res = await productService.create(dtoTalla, { headers: { 'X-Idempotency-Key': crypto.randomUUID() } })
          const creado = res.data?.data ?? res.data
          if (creado?.id && form.imagenes.length > 0) {
            try { await productService.sincronizarImagenes(creado.id, form.imagenes) } catch { /* se avisa una sola vez abajo */ }
          }
          if (!productoId) { productoId = creado?.id; pendienteAprobacion = creado?.visibleCatalogo === false }
        }
      } else {
        const dtoFinal = paresTalla.length === 1
          ? { ...dto, talla: paresTalla[0].talla, stockActual: Number(paresTalla[0].cantidad) }
          : dto
        const res = await productService.create(dtoFinal, { headers: { 'X-Idempotency-Key': idempotencyKey.current } })
        const productoCreadoData = res.data?.data ?? res.data
        productoId = productoCreadoData?.id
        pendienteAprobacion = productoCreadoData?.visibleCatalogo === false

        if (productoId && form.imagenes.length > 0) {
          try {
            await productService.sincronizarImagenes(productoId, form.imagenes)
          } catch {
            toast({ message: 'Producto creado pero hubo un error al guardar las fotos. Editá el producto para agregarlas.', type: 'warning' })
          }
        }
      }

      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignorar */ }
      setTieneBorrador(false)
      setProductoCreado({ id: productoId, nombre: form.nombre, imagen: imagenUrl, pendienteAprobacion })
      setDone(true)

      const seoTitle = sl.es?.title || form.metaTitle || ''
      if (seoTitle && productoId) {
        productService.adminGetAll(0, 200).then(r => {
          const lista = r.data?.content ?? (Array.isArray(r.data) ? r.data : [])
          const dupes = lista.filter(p => p.metaTitle === seoTitle && p.id !== productoId)
          if (dupes.length > 0) {
            toast({ message: `El título SEO "${seoTitle.slice(0, 45)}…" ya existe en otro producto. Editalo para diferenciarlo.`, type: 'warning' })
          }
        }).catch((err) => console.error('[wizard] chequeo SEO duplicado', err))
      }
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        toast({ message: 'Este producto ya fue publicado en otra pestaña. Actualizá la página.', type: 'warning' })
        setDone(true)
      } else {
        toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
      }
    } finally { setSaving(false) }
  }

  return { handleAnalizar, handleSave }
}
