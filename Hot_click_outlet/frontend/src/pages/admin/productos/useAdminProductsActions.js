import { useCallback, useRef } from 'react'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import {
  EMPTY_FORM,
  PROD_PAGE_SIZE,
  formDesdeProducto,
} from './productosHelpers'

/**
 * Handlers CRUD, carrusel, carga y modal de productos admin — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminProductsActions(deps) {
  const {
    prodPage,
    bodegas,
    products,
    carruselSlots,
    form,
    editing,
    deleteTarget,
    editInitialFormRef,
    toast,
    setProducts,
    setTotalProds,
    setCategories,
    setBodegas,
    setMarcas,
    setLoading,
    setLoadError,
    setEditing,
    setForm,
    setModalOpen,
    setSaving,
    setDeleteTarget,
    setSeoAutoTitle,
    setSeoAutoDesc,
    setSeoOpen,
    setShowDiscardModal,
  } = deps

  const loadIdRef = useRef(0)

  const load = useCallback(async (page = prodPage) => {
    const id = ++loadIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const [prodsRes, catsRes, bodsRes, marcsRes] = await Promise.allSettled([
        productService.adminGetAll(page, PROD_PAGE_SIZE),
        productService.getCategories(),
        warehouseService.getAll(),
        marcaService.getAll(),
      ])
      if (id !== loadIdRef.current) return
      if (prodsRes.status === 'rejected') throw prodsRes.reason
      const prods = prodsRes.value.data
      const cats = catsRes.status === 'fulfilled' ? (catsRes.value.data ?? []) : []
      const bods = bodsRes.status === 'fulfilled' ? (bodsRes.value.data ?? []) : []
      const marcsR = marcsRes.status === 'fulfilled' ? (marcsRes.value.data ?? []) : []
      const pageData = prods.content ?? prods ?? []
      setProducts(pageData)
      setTotalProds(prods.totalElements ?? pageData.length)
      setCategories(cats ?? [])
      setBodegas(Array.isArray(bods) ? bods : bods?.content ?? [])
      setMarcas(Array.isArray(marcsR) ? marcsR : [])
    } catch {
      if (id === loadIdRef.current) setLoadError(true)
    } finally {
      if (id === loadIdRef.current) setLoading(false)
    }
  }, [
    prodPage,
    setLoading,
    setLoadError,
    setProducts,
    setTotalProds,
    setCategories,
    setBodegas,
    setMarcas,
  ])

  const openNew = useCallback(() => {
    setEditing(null)
    editInitialFormRef.current = null
    setSeoAutoTitle(true)
    setSeoAutoDesc(true)
    setSeoOpen(false)
    setForm({ ...EMPTY_FORM, bodegaId: bodegas[0]?.id ?? '' })
    setModalOpen(true)
  }, [
    bodegas,
    editInitialFormRef,
    setEditing,
    setForm,
    setModalOpen,
    setSeoAutoDesc,
    setSeoAutoTitle,
    setSeoOpen,
  ])

  const openEdit = useCallback(async (p) => {
    setEditing(p)
    setSeoAutoTitle(false)
    setSeoAutoDesc(false)
    const inicial = formDesdeProducto(p, bodegas)
    setForm(inicial)
    setModalOpen(true)
    try {
      const { data: imgs } = await productService.getImagenes(p.id)
      const urls = (Array.isArray(imgs) ? imgs : []).map((i) => i.urlImagen ?? i)
      if (urls.length > 0) {
        setForm((prev) => {
          const updated = { ...prev, imagenes: urls }
          editInitialFormRef.current = JSON.stringify(updated)
          return updated
        })
      } else {
        editInitialFormRef.current = JSON.stringify(inicial)
      }
    } catch {
      editInitialFormRef.current = JSON.stringify(form)
    }
  }, [
    bodegas,
    editInitialFormRef,
    form,
    setEditing,
    setForm,
    setModalOpen,
    setSeoAutoDesc,
    setSeoAutoTitle,
  ])

  const handleToggleCarrusel = useCallback(async (p) => {
    const yaEsta = p.enCarrusel
    if (yaEsta) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enCarrusel: false, ordenCarrusel: 0 } : x)))
      try {
        await productService.toggleCarrusel(p.id, false, 0)
      } catch {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enCarrusel: true } : x)))
      }
      return
    }
    if (carruselSlots.length >= 5) {
      toast({ message: 'El carrusel ya tiene 5 productos (máximo)', type: 'error' })
      return
    }
    const existing = [...carruselSlots]
    const allAssignments = [
      ...existing.map((s, i) => ({ id: s.id, orden: i + 1 })),
      { id: p.id, orden: existing.length + 1 },
    ]
    setProducts((prev) => prev.map((x) => {
      const a = allAssignments.find((n) => n.id === x.id)
      return a ? { ...x, enCarrusel: true, ordenCarrusel: a.orden } : x
    }))
    try {
      await Promise.all(allAssignments.map(({ id, orden }) =>
        productService.toggleCarrusel(id, true, orden),
      ))
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, enCarrusel: false } : x)))
    }
  }, [carruselSlots, setProducts, toast])

  const handleCarruselMover = useCallback(async (p, dir) => {
    const sorted = [...products]
      .filter((x) => x.enCarrusel)
      .sort((a, b) => (a.ordenCarrusel ?? 0) - (b.ordenCarrusel ?? 0))

    const idx = sorted.findIndex((x) => x.id === p.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const reordered = [...sorted]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    const assignments = reordered.map((s, i) => ({ id: s.id, orden: i + 1 }))

    setProducts((prev) => prev.map((x) => {
      const a = assignments.find((n) => n.id === x.id)
      return a ? { ...x, ordenCarrusel: a.orden } : x
    }))

    try {
      await Promise.all(assignments.map(({ id, orden }) =>
        productService.toggleCarrusel(id, true, orden),
      ))
    } catch {
      toast({ message: 'Error al reordenar el carrusel', type: 'error' })
      load()
    }
  }, [products, setProducts, toast, load])

  const handleToggleDestacado = useCallback(async (p) => {
    const nuevoValor = !p.destacado
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, destacado: nuevoValor } : x)))
    try {
      await productService.toggleDestacado(p.id, nuevoValor)
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, destacado: p.destacado } : x)))
      toast({ message: 'Error al actualizar destacado', type: 'error' })
    }
  }, [setProducts, toast])

  const handleSave = useCallback(async (e) => {
    e.preventDefault()
    if (!form.categoriaId) {
      toast({ message: 'Selecciona una categoría', type: 'error' })
      return
    }
    if (!form.bodegaId && bodegas.length > 0) {
      toast({ message: 'Selecciona una bodega', type: 'error' })
      return
    }
    const compra = Number(form.precioCompra)
    const venta = Number(form.precioVenta)
    if (compra < 0) {
      toast({ message: 'El precio de compra no puede ser negativo', type: 'error' })
      return
    }
    if (venta < 0) {
      toast({ message: 'El precio de venta no puede ser negativo', type: 'error' })
      return
    }
    if (venta < compra) {
      toast({ message: 'El precio de venta no puede ser menor al precio de compra', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const dto = denormalizeProduct(form)
      if (form.imagenes.length > 0) dto.imagenPrincipalUrl = form.imagenes[0]
      let productoId
      if (editing) {
        await productService.update(editing.id, dto)
        productoId = editing.id
        toast({ message: 'Producto actualizado', type: 'success' })
      } else {
        const res = await productService.create(dto)
        productoId = res.data?.id ?? res.data?.data?.id
        toast({ message: 'Producto creado', type: 'success' })
      }
      if (productoId && form.imagenes.length > 0) {
        await productService.sincronizarImagenes(productoId, form.imagenes)
      }
      editInitialFormRef.current = null
      setModalOpen(false)
      load()
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al guardar'
      toast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [
    bodegas.length,
    editing,
    editInitialFormRef,
    form,
    load,
    setModalOpen,
    setSaving,
    toast,
  ])

  const handleDelete = useCallback((id, nombre) => {
    setDeleteTarget({ id, nombre })
  }, [setDeleteTarget])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await productService.delete(id)
      toast({ message: 'Producto eliminado', type: 'success' })
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast({ message: 'Error al eliminar', type: 'error' })
    }
  }, [deleteTarget, setDeleteTarget, setProducts, toast])

  const handleModalClose = useCallback(() => {
    const sucio = editing && editInitialFormRef.current
      ? JSON.stringify(form) !== editInitialFormRef.current
      : false
    if (sucio) {
      setShowDiscardModal(true)
      return
    }
    setModalOpen(false)
  }, [editing, editInitialFormRef, form, setModalOpen, setShowDiscardModal])

  const handleImportBulk = useCallback(async (rows) => {
    await productService.importBulk(rows)
    load(0)
  }, [load])

  return {
    load,
    openNew,
    openEdit,
    handleToggleCarrusel,
    handleCarruselMover,
    handleToggleDestacado,
    handleSave,
    handleDelete,
    confirmDelete,
    handleModalClose,
    handleImportBulk,
  }
}
