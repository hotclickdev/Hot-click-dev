import { useCallback } from 'react'
import { productService } from '@/services/productService'
import { EMPTY_FORM, formDesdeProducto, urlsDesdeImagenes } from './productosHelpers'
import type { AdminProductsActionsDeps, ProductoAdmin } from './productosHelpers'

export function useAdminProductsForm(deps: Pick<AdminProductsActionsDeps,
  | 'bodegas'
  | 'form'
  | 'editing'
  | 'editInitialFormRef'
  | 'setEditing'
  | 'setForm'
  | 'setModalOpen'
  | 'setSeoAutoTitle'
  | 'setSeoAutoDesc'
  | 'setSeoOpen'
  | 'setShowDiscardModal'
>) {
  const {
    bodegas,
    form,
    editing,
    editInitialFormRef,
    setEditing,
    setForm,
    setModalOpen,
    setSeoAutoTitle,
    setSeoAutoDesc,
    setSeoOpen,
    setShowDiscardModal,
  } = deps

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

  const openEdit = useCallback(async (p: ProductoAdmin) => {
    setEditing(p)
    setSeoAutoTitle(false)
    setSeoAutoDesc(false)
    const inicial = formDesdeProducto(p, bodegas)
    setForm(inicial)
    setModalOpen(true)
    try {
      const { data: imgs } = await productService.getImagenes(p.id)
      const urls = urlsDesdeImagenes(imgs)
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

  return { openNew, openEdit, handleModalClose }
}
