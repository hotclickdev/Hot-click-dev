import { useCallback, type FormEvent } from 'react'
import { productService, denormalizeProduct } from '@/services/productService'
import { ofertaService } from '@/services/ofertaService'
import {
  PCT_OFERTA_RAPIDA,
  idDesdeRespuestaProducto,
  mensajeErrorProducto,
} from './productosHelpers'
import type { AdminProductsActionsDeps, ProductoAdmin } from './productosHelpers'

export function useAdminProductsCrud(deps: Pick<AdminProductsActionsDeps,
  | 'bodegas'
  | 'form'
  | 'editing'
  | 'deleteTarget'
  | 'editInitialFormRef'
  | 'toast'
  | 'setProducts'
  | 'setModalOpen'
  | 'setSaving'
  | 'setDeleteTarget'
> & { load: (page?: number) => void | Promise<void> }) {
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

  const handleSave = useCallback(async (e: FormEvent) => {
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
        productoId = idDesdeRespuestaProducto(res.data)
        toast({ message: 'Producto creado', type: 'success' })
      }
      if (productoId && form.imagenes.length > 0) {
        await productService.sincronizarImagenes(productoId, form.imagenes)
      }
      editInitialFormRef.current = null
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      const msg = mensajeErrorProducto(err, 'Error al guardar')
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

  const handleDelete = useCallback((id: number, nombre: string) => {
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

  const handleImportBulk = useCallback(async (rows: unknown[]) => {
    await productService.importBulk(rows)
    load(0)
  }, [load])

  const handleOfertaRapida = useCallback(async (producto: ProductoAdmin) => {
    try {
      const { data } = await ofertaService.aplicar(producto.id, true, PCT_OFERTA_RAPIDA)
      const pendiente = typeof data === 'object' && data !== null && 'pendiente' in data
        ? Boolean((data as { pendiente?: unknown }).pendiente)
        : false
      if (pendiente) {
        toast({ message: 'Oferta enviada — HOTCLICK revisa antes de publicar', type: 'success' })
        return
      }
      toast({ message: `Oferta de ${PCT_OFERTA_RAPIDA}% aplicada`, type: 'success' })
      load()
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'No se pudo enviar la oferta'), type: 'error' })
    }
  }, [load, toast])

  const handleOcultar = useCallback(async (producto: ProductoAdmin) => {
    const visible = producto.visibleCatalogo !== false
    try {
      await productService.toggleVisibleCatalogo(producto.id, !visible)
      setProducts((prev) => prev.map((p) => (
        p.id === producto.id ? { ...p, visibleCatalogo: !visible } : p
      )))
      toast({ message: visible ? 'Producto oculto del catálogo' : 'Producto visible de nuevo', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'No se pudo cambiar la visibilidad'), type: 'error' })
    }
  }, [setProducts, toast])

  return {
    handleSave,
    handleDelete,
    confirmDelete,
    handleImportBulk,
    handleOfertaRapida,
    handleOcultar,
  }
}
