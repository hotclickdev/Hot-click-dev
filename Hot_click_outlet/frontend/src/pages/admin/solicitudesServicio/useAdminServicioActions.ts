import { useCallback } from 'react'
import { servicioService } from '@/services/servicioService'
import type { SolicitudServicio } from './servicioHelpers'
import type { QueryClient } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { Id } from '@/types/api'

/**
 * Handlers solicitudes servicio — bit-idéntico al original.
 */
export function useAdminServicioActions(deps: {
  selected: SolicitudServicio | null
  nuevoEstado: string
  notas: string
  qc: QueryClient
  t: TFunction
  setSelected: Dispatch<SetStateAction<SolicitudServicio | null>>
  setNuevoEstado: Dispatch<SetStateAction<string>>
  setNotas: Dispatch<SetStateAction<string>>
  setSaving: Dispatch<SetStateAction<boolean>>
}) {
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

  const openDetalle = useCallback((s: SolicitudServicio) => {
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

  const handleEliminar = useCallback(async (id: Id) => {
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
