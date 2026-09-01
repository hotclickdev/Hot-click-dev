import { useQuery } from '@tanstack/react-query'
import { encargoService, listaEncargosDesdeRespuesta } from '@/services/encargoService'

export function useEncargos(filtro: string) {
  return useQuery({
    queryKey: ['encargos', filtro],
    queryFn: () => encargoService.listar(filtro === 'TODOS' ? undefined : filtro)
      .then((r) => listaEncargosDesdeRespuesta(r.data)),
  })
}

export function useEncargosKpis() {
  return useQuery({
    queryKey: ['encargos', 'kpis'],
    queryFn: () => encargoService.kpis().then((r) => {
      const body = r.data as { data?: Record<string, number> }
      return body.data ?? (r.data as Record<string, number>)
    }),
  })
}

export function useEncargosPendientesCount() {
  return useQuery({
    queryKey: ['encargos', 'kpis', 'pendientes'],
    queryFn: () => encargoService.kpis().then((r) => {
      const body = r.data as { data?: { pendientes?: number } }
      const kpis = body.data ?? (r.data as { pendientes?: number })
      return Number(kpis.pendientes ?? 0)
    }),
    staleTime: 60_000,
  })
}
