import { useCallback } from 'react'
import { productService, denormalizeProduct } from '@/services/productService'

/**
 * Guardar, eliminar e importar productos admin.
 * @param {object} deps
 */
export function useAdminProductsCrud(deps) {
  const {
    bodegas,
    form,
    editing,
    deleteTarget,
    editInitialFormRef,
    toast,
    load,
    setProducts,
    setModalOpen,
    setSaving,
    setDeleteTarget,
  } = deps

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

  const handleImportBulk = useCallback(async (rows) => {
    await productService.importBulk(rows)
    load(0)
  }, [load])

  return { handleSave, handleDelete, confirmDelete, handleImportBulk }
}
