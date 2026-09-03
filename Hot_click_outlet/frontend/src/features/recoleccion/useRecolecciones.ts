import { useQuery } from '@tanstack/react-query'
import { recoleccionService } from '@/services/recoleccionService'
import { listaRecolecciones } from './recoleccionHelpers'

export function useRecolecciones() {
  return useQuery({
    queryKey: ['recolecciones'],
    queryFn: () => recoleccionService.listar().then((r) => listaRecolecciones(r.data)),
  })
}
