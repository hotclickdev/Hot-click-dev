import api from '@/services/api'
import type { ProvinciaOficial } from '@/utils/divisionTerritorialOficial'

type Respuesta = ProvinciaOficial[] | { data?: ProvinciaOficial[] }

/** El interceptor de api.ts ya quita el sobre {success, data}: acepta la lista directa o envuelta (QA-114-2). */
export function extraerCatalogo(cuerpo: unknown): ProvinciaOficial[] {
  if (Array.isArray(cuerpo)) return cuerpo as ProvinciaOficial[]
  const interno = (cuerpo as { data?: unknown } | null)?.data
  return Array.isArray(interno) ? (interno as ProvinciaOficial[]) : []
}

let vuelo: Promise<ProvinciaOficial[]> | null = null

/** Catálogo del IGN. Una sola petición aunque varios formularios lo pidan. */
export function cargarDivisionTerritorial(): Promise<ProvinciaOficial[]> {
  if (!vuelo) {
    vuelo = api.get<Respuesta>('/division-territorial')
      .then(({ data }) => {
        const lista = extraerCatalogo(data)
        if (lista.length === 0) throw new Error('catálogo vacío')
        return lista
      })
      .catch((err: unknown) => {
        vuelo = null
        throw err
      })
  }
  return vuelo
}
