import { useCallback } from 'react'
import { compraService } from '@/services/compraService'
import { EMPTY_PROVEEDOR } from './proveedoresHelpers'

/**
 * Handlers CRUD proveedores — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminProveedoresActions(deps) {
  const {
    showToast,
    form,
    editing,
    deleteTarget,
    setProveedores,
    setLoading,
    setModalOpen,
    setEditing,
    setForm,
    setSaving,
    setDeleteTarget,
    setCostosTarget,
    setHistorial,
    setLoadingHistorial,
    load,
  } = deps

  const openNew = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_PROVEEDOR)
    setModalOpen(true)
  }, [setEditing, setForm, setModalOpen])

  const openEdit = useCallback((p) => {
    setEditing(p)
    setForm({
      nombre: p.nombre,
      contacto: p.contacto ?? '',
      telefono: p.telefono ?? '',
      correo: p.correo ?? '',
      notas: p.notas ?? '',
      tipo: p.tipo ?? 'PRODUCTO_TERMINADO',
    })
    setModalOpen(true)
  }, [setEditing, setForm, setModalOpen])

  const openCostos = useCallback((p) => {
    setCostosTarget(p)
    setLoadingHistorial(true)
    compraService.historialCostosProveedor(p.id)
      .then(setHistorial)
      .catch(() => showToast('Error al cargar historial de costos', 'error'))
      .finally(() => setLoadingHistorial(false))
  }, [setCostosTarget, setHistorial, setLoadingHistorial, showToast])

  const handleSave = useCallback(async () => {
    if (!form.nombre.trim()) { showToast('El nombre es requerido', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await compraService.actualizarProveedor(editing.id, form)
        showToast('Proveedor actualizado', 'success')
      } else {
        await compraService.crearProveedor(form)
        showToast('Proveedor creado', 'success')
      }
      setModalOpen(false)
      load()
    } catch {
      showToast('Error al guardar proveedor', 'error')
    } finally {
      setSaving(false)
    }
  }, [editing, form, load, setModalOpen, setSaving, showToast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await compraService.eliminarProveedor(deleteTarget.id)
      showToast('Proveedor eliminado', 'success')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('Error al eliminar', 'error')
    }
  }, [deleteTarget, load, setDeleteTarget, showToast])

  return {
    openNew,
    openEdit,
    openCostos,
    handleSave,
    handleDelete,
  }
}
