import api from '@/services/api'
import type { ProvinciaOficial } from '@/utils/divisionTerritorialOficial'

type Respuesta = { data?: ProvinciaOficial[] }

let vuelo: Promise<ProvinciaOficial[]> | null = null

/** Catálogo del IGN. Una sola petición aunque varios formularios lo pidan. */
export function cargarDivisionTerritorial(): Promise<ProvinciaOficial[]> {
  if (!vuelo) {
    vuelo = api.get<Respuesta>('/division-territorial')
      .then(({ data }) => {
        const lista = data?.data
        if (!Array.isArray(lista) || lista.length === 0) throw new Error('catálogo vacío')
        return lista
      })
      .catch((err: unknown) => {
        vuelo = null
        throw err
      })
  }
  return vuelo
}
