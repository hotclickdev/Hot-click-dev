import { useQuery } from '@tanstack/react-query'
import { encargoService, kpisDesdeRespuesta, listaEncargosDesdeRespuesta } from '@/services/encargoService'

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
    queryFn: () => encargoService.kpis().then((r) => kpisDesdeRespuesta(r.data)),
  })
}

export function useEncargosPendientesCount() {
  return useQuery({
    queryKey: ['encargos', 'kpis', 'pendientes'],
    queryFn: () => encargoService.kpis().then((r) => {
      const kpis = kpisDesdeRespuesta(r.data)
      return Number(kpis?.pendientes ?? 0)
    }),
    staleTime: 60_000,
  })
}
