import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { garantiaService } from '@/services/garantiaService'
import type { SolicitudGarantia } from './garantiaHelpers'
import type { QueryClient } from '@tanstack/react-query'

/**
 * Handlers solicitudes garantía — bit-idéntico al original.
 */
export function useAdminGarantiaActions(deps: {
  selected: SolicitudGarantia | null
  nuevoEstado: string
  notas: string
  qc: QueryClient
  setSelected: Dispatch<SetStateAction<SolicitudGarantia | null>>
  setNuevoEstado: Dispatch<SetStateAction<string>>
  setNotas: Dispatch<SetStateAction<string>>
  setSaving: Dispatch<SetStateAction<boolean>>
}) {
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

  const openDetalle = useCallback((s: SolicitudGarantia) => {
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
