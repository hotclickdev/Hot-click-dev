import api from './api'
import type { PriceBandId } from '@/utils/gustos'

export type GustosAffinityResponse = {
  scores: Record<string, number>
  selectedCategoryIds: string[]
  selectedPriceBands: PriceBandId[]
  fromBackend: boolean
}

/** Memoria de chat → scores para Descubrí / para_vos (solo lectura, requiere sesión). */
export async function getGustosAffinity(visitorId: string): Promise<GustosAffinityResponse> {
  const { data } = await api.get<GustosAffinityResponse>('/customer-memory/affinity', {
    params: { visitorId },
  })
  return data
}
