import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { compraService } from '@/services/compraService'
import { EMPTY_PROVEEDOR } from './proveedoresHelpers'
import type { CostoHistorial, ProveedorAdmin, ProveedorForm, ToastProveedor } from './proveedoresHelpers'
import type { JsonBody } from '@/types/api'

/**
 * Handlers CRUD proveedores — bit-idéntico al original.
 */
export function useAdminProveedoresActions(deps: {
  showToast: ToastProveedor
  form: ProveedorForm
  editing: ProveedorAdmin | null
  deleteTarget: ProveedorAdmin | null
  setModalOpen: Dispatch<SetStateAction<boolean>>
  setEditing: Dispatch<SetStateAction<ProveedorAdmin | null>>
  setForm: Dispatch<SetStateAction<ProveedorForm>>
  setSaving: Dispatch<SetStateAction<boolean>>
  setDeleteTarget: Dispatch<SetStateAction<ProveedorAdmin | null>>
  setCostosTarget: Dispatch<SetStateAction<ProveedorAdmin | null>>
  setHistorial: Dispatch<SetStateAction<CostoHistorial[]>>
  setLoadingHistorial: Dispatch<SetStateAction<boolean>>
  load: () => void
  setProveedores?: Dispatch<SetStateAction<ProveedorAdmin[]>>
  setLoading?: Dispatch<SetStateAction<boolean>>
}) {
  const {
    showToast,
    form,
    editing,
    deleteTarget,
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

  const openEdit = useCallback((p: ProveedorAdmin) => {
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

  const openCostos = useCallback((p: ProveedorAdmin) => {
    setCostosTarget(p)
    setLoadingHistorial(true)
    compraService.historialCostosProveedor(p.id)
      .then((data: unknown) => setHistorial(Array.isArray(data) ? data as CostoHistorial[] : []))
      .catch((err: unknown) => { void err; showToast('Error al cargar historial de costos', 'error') })
      .finally(() => setLoadingHistorial(false))
  }, [setCostosTarget, setHistorial, setLoadingHistorial, showToast])

  const handleSave = useCallback(async () => {
    if (!form.nombre.trim()) { showToast('El nombre es requerido', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await compraService.actualizarProveedor(editing.id, form as unknown as JsonBody)
        showToast('Proveedor actualizado', 'success')
      } else {
        await compraService.crearProveedor(form as unknown as JsonBody)
        showToast('Proveedor creado', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      void err
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
    } catch (err: unknown) {
      void err
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
