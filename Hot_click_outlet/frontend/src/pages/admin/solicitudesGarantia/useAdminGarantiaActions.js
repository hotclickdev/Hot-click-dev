import { useCallback } from 'react'
import { garantiaService } from '@/services/garantiaService'

/**
 * Handlers solicitudes garantía — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminGarantiaActions(deps) {
  const {
    selected,
    nuevoEstado,
    notas,
    qc,
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
      await garantiaService.cambiarEstado(selected.id, nuevoEstado, notas)
      qc.invalidateQueries({ queryKey: ['admin-solicitudes-garantia'] })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }, [nuevoEstado, notas, qc, selected, setSaving, setSelected])

  return {
    openDetalle,
    handleGuardar,
  }
}
