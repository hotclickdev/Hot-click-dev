import api from '@/services/api'
import type {
  ConversacionBandeja,
  DetalleBandeja,
  FiltrosBandeja,
  MensajeBandeja,
  MiembroBandeja,
  PaginaBandeja,
  ResumenBandeja,
  ResumenConversacion,
} from './bandejaTypes'
import { paramsDeFiltros } from './bandejaHelpers'

const TAMANO_PAGINA = 20

export const bandejaService = {
  listar: (f: FiltrosBandeja) =>
    api.get<PaginaBandeja>('/bandeja', { params: paramsDeFiltros(f, TAMANO_PAGINA) }).then((r) => r.data),
  resumen: () => api.get<ResumenBandeja>('/bandeja/resumen').then((r) => r.data),
  equipo: () => api.get<MiembroBandeja[]>('/bandeja/equipo').then((r) => r.data),
  detalle: (id: string) => api.get<DetalleBandeja>(`/bandeja/${id}/mensajes`).then((r) => r.data),
  resumenConversacion: (id: string) =>
    api.get<ResumenConversacion>(`/bandeja/${id}/resumen`).then((r) => r.data),
  responder: (id: string, texto: string) =>
    api.post<MensajeBandeja>(`/bandeja/${id}/responder`, { texto }).then((r) => r.data),
  pausar: (id: string) => api.post<ConversacionBandeja>(`/bandeja/${id}/pausar`).then((r) => r.data),
  reanudar: (id: string) => api.post<ConversacionBandeja>(`/bandeja/${id}/reanudar`).then((r) => r.data),
  tomar: (id: string) => api.post<ConversacionBandeja>(`/bandeja/${id}/tomar`).then((r) => r.data),
  asignar: (id: string, usuarioId: number) =>
    api.post<ConversacionBandeja>(`/bandeja/${id}/asignar`, { usuarioId }).then((r) => r.data),
  cerrar: (id: string) => api.post<ConversacionBandeja>(`/bandeja/${id}/cerrar`).then((r) => r.data),
}
