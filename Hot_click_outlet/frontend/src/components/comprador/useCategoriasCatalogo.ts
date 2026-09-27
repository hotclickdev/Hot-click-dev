import { useQuery } from '@tanstack/react-query'
import { categoriaCatalogoService, type CategoriaConProductos } from '@/services/categoriaCatalogoService'

const CATEGORIAS_VIGENCIA_MS = 60_000

/** Categorías del catálogo público compartidas por header, Home y /categorias. */
export function useCategoriasCatalogo(): { categorias: CategoriaConProductos[]; cargando: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['categorias-con-productos'],
    queryFn: categoriaCatalogoService.conProductos,
    staleTime: CATEGORIAS_VIGENCIA_MS,
  })
  return { categorias: data ?? [], cargando: isLoading }
}
