import api from '@/services/api'
import type {
  Campana,
  DetalleCampana,
  EstadoCatalogo,
  EstimacionCampana,
  PedidoCampana,
  PedidoPlantilla,
  PlantillaMarketing,
  ResumenConsentimientos,
} from './campanaTypes'

/** Campañas (AG-36) y catálogo de Meta (AG-37). La empresa la fija el servidor, nunca el navegador. */
export const campanaService = {
  consentimientos: () => api.get<ResumenConsentimientos>('/agente/campanas/consentimientos').then((r) => r.data),
  plantillas: () => api.get<PlantillaMarketing[]>('/agente/campanas/plantillas').then((r) => r.data),
  crearPlantilla: (p: PedidoPlantilla) =>
    api.post<PlantillaMarketing>('/agente/campanas/plantillas', p).then((r) => r.data),
  sincronizarPlantilla: (id: number) =>
    api.post<PlantillaMarketing>(`/agente/campanas/plantillas/${id}/sincronizar`).then((r) => r.data),

  campanas: () => api.get<Campana[]>('/agente/campanas').then((r) => r.data),
  campana: (id: number) => api.get<DetalleCampana>(`/agente/campanas/${id}`).then((r) => r.data),
  crearCampana: (p: PedidoCampana) => api.post<Campana>('/agente/campanas', p).then((r) => r.data),
  estimarCampana: (id: number) =>
    api.get<EstimacionCampana>(`/agente/campanas/${id}/estimacion`).then((r) => r.data),
  lanzarCampana: (id: number, costoConfirmadoUsd: number) =>
    api.post<Campana>(`/agente/campanas/${id}/lanzar`, { costoConfirmadoUsd }).then((r) => r.data),
  cancelarCampana: (id: number) => api.post<Campana>(`/agente/campanas/${id}/cancelar`).then((r) => r.data),

  catalogoMeta: () => api.get<EstadoCatalogo>('/agente/catalogo').then((r) => r.data),
  conectarCatalogo: (catalogoId: string) =>
    api.post<EstadoCatalogo>('/agente/catalogo', { catalogoId }).then((r) => r.data),
  sincronizarCatalogo: () => api.post<{ pedidos: number }>('/agente/catalogo/sincronizar').then((r) => r.data),
  desconectarCatalogo: () => api.delete('/agente/catalogo').then(() => undefined),
}
