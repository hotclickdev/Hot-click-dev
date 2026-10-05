import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { normalizarListaNegocios, planDesdeParam, type AliasPlan } from '@/components/comprador/negocios/negociosPublicos'
import { useCategoriasCatalogo } from '@/components/comprador/useCategoriasCatalogo'
import { negocioService } from '@/services/negocioService'
import { productService } from '@/services/productService'
import {
  LIMITE_DIRECTORIO_PLAN, TAMANO_PAGINA_PUBLICA, TOPE_PAGINAS_CATALOGO,
  categoriasDelPlan, metaPagina, productoDePlan, type ProductoDePlan,
} from './categoriasPorPlan'

const VIGENCIA_MS = 60_000

async function slugsDelPlan(alias: AliasPlan, signal: AbortSignal): Promise<Set<string>> {
  const { data } = await negocioService.buscar({ plan: alias, limite: LIMITE_DIRECTORIO_PLAN }, signal)
  return new Set(normalizarListaNegocios(data).map((negocio) => negocio.slug))
}

/** Mismo listado que el catálogo público; el plan se cruza después por slug de tienda. */
async function productosDeCatalogoPublico(): Promise<ProductoDePlan[]> {
  const filas: ProductoDePlan[] = []
  for (let page = 0; page < TOPE_PAGINAS_CATALOGO; page++) {
    const { data } = await productService.getAll(page, TAMANO_PAGINA_PUBLICA)
    const pagina = metaPagina(data)
    for (const item of pagina.items) {
      const fila = productoDePlan(item)
      if (fila) filas.push(fila)
    }
    if (page + 1 >= pagina.totalPages || pagina.items.length === 0) break
  }
  return filas
}

/** «Todos» usa las categorías públicas. Un plan cruza directorio + productos y oculta el conteo en cero. */
export function useCategoriasPorPlan(planParam: string | null) {
  const plan = planDesdeParam(planParam)
  const alias = plan?.alias ?? null
  const { categorias, cargando: cargandoTodas } = useCategoriasCatalogo()

  const negocios = useQuery({
    queryKey: ['categorias-slugs-plan', alias],
    enabled: alias != null,
    staleTime: VIGENCIA_MS,
    queryFn: ({ signal }) => slugsDelPlan(alias as AliasPlan, signal).catch((error: unknown) => {
      if (!signal.aborted) console.error('[CategoriasPage] directorio por plan', error)
      throw error
    }),
  })

  const catalogo = useQuery({
    queryKey: ['categorias-productos-plan'],
    enabled: alias != null,
    staleTime: VIGENCIA_MS,
    queryFn: () => productosDeCatalogoPublico().catch((error: unknown) => {
      console.error('[CategoriasPage] productos por plan', error)
      throw error
    }),
  })

  const filtradas = useMemo(() => {
    if (!alias) return categorias
    if (!negocios.data || !catalogo.data) return []
    return categoriasDelPlan(categorias, catalogo.data, negocios.data)
  }, [alias, categorias, negocios.data, catalogo.data])

  const error = alias != null && (negocios.isError || catalogo.isError)
  const listo = negocios.isSuccess && catalogo.isSuccess
  return {
    categorias: filtradas,
    cargando: alias ? cargandoTodas || (!error && !listo) : cargandoTodas,
    error,
    plan,
  }
}
