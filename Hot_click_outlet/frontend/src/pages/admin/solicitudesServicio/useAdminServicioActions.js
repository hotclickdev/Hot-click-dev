import { useCallback } from 'react'
import { servicioService } from '@/services/servicioService'

/**
 * Handlers solicitudes servicio — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminServicioActions(deps) {
  const {
    selected,
    nuevoEstado,
    notas,
    qc,
    t,
    setSelected,
    setNuevoEstado,
    setNotas,
    setSaving,
  } = deps

  const openDetalle = useCallback((s) => {
    setSelected(s)
    setNuevoEstado(s.estado)
    setNotas(s.notasAdmin || '')
  }, [setNotas, setNuevoEstado, setSelected])

  const handleGuardar = useCallback(async () => {
    if (!selected) return
    setSaving(true)
    try {
      await servicioService.cambiarEstado(selected.id, nuevoEstado, notas)
      qc.invalidateQueries({ queryKey: ['admin-solicitudes-servicio'] })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }, [nuevoEstado, notas, qc, selected, setSaving, setSelected])

  const handleEliminar = useCallback(async (id) => {
    if (!confirm(t('adminSolicitudes.confirmDelete'))) return
    await servicioService.eliminar(id)
    qc.invalidateQueries({ queryKey: ['admin-solicitudes-servicio'] })
    setSelected(null)
  }, [qc, setSelected, t])

  return {
    openDetalle,
    handleGuardar,
    handleEliminar,
  }
}
