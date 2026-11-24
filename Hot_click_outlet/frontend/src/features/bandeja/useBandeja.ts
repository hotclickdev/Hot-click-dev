import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { bandejaService } from './bandejaService'
import { INTERVALO_REFRESCO_MS } from './bandejaHelpers'
import type { FiltrosBandeja } from './bandejaTypes'

export const CLAVE_BANDEJA = ['bandeja'] as const

export function useConversaciones(filtros: FiltrosBandeja) {
  return useQuery({
    queryKey: [...CLAVE_BANDEJA, 'lista', filtros],
    queryFn: () => bandejaService.listar(filtros),
    refetchInterval: INTERVALO_REFRESCO_MS,
    placeholderData: keepPreviousData,
  })
}

export function useDetalleConversacion(id: string | null) {
  return useQuery({
    queryKey: [...CLAVE_BANDEJA, 'detalle', id],
    queryFn: () => bandejaService.detalle(id as string),
    enabled: id != null,
    refetchInterval: INTERVALO_REFRESCO_MS,
  })
}

export function useEquipoBandeja() {
  return useQuery({
    queryKey: [...CLAVE_BANDEJA, 'equipo'],
    queryFn: () => bandejaService.equipo(),
    staleTime: 5 * 60_000,
  })
}

/** Contador del aviso en el panel: conversaciones abiertas asignadas a mí y sin asignar. */
export function useResumenBandeja(habilitado = true) {
  return useQuery({
    queryKey: [...CLAVE_BANDEJA, 'resumen'],
    queryFn: () => bandejaService.resumen(),
    enabled: habilitado,
    refetchInterval: INTERVALO_REFRESCO_MS * 3,
    staleTime: INTERVALO_REFRESCO_MS,
    retry: false,
  })
}
