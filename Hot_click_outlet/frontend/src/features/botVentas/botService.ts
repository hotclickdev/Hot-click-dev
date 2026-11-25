import api from '@/services/api'
import type {
  CanalBot,
  CodigoVinculacion,
  ConfigBot,
  Conocimiento,
  EstadoLead,
  EstadoVinculacion,
  Lead,
  MiembroVinculado,
  PedidoConfigBot,
  PedidoConocimiento,
  ResultadoSimulador,
  TipoLead,
  TurnoSimulador,
  RespuestaMetricasBot,
  UsoBot,
} from './botTypes'

export const botService = {
  metricas: (desde: string, hasta: string) =>
    api.get<RespuestaMetricasBot>('/agente/metricas', { params: { desde, hasta } }).then((r) => r.data),
  uso: () => api.get<UsoBot>('/agente/uso').then((r) => r.data),
  config: () => api.get<ConfigBot>('/agente/config').then((r) => r.data),
  guardarConfig: (p: PedidoConfigBot) => api.put<ConfigBot>('/agente/config', p).then((r) => r.data),

  conocimiento: () => api.get<Conocimiento[]>('/agente/conocimiento').then((r) => r.data),
  crearConocimiento: (p: PedidoConocimiento) =>
    api.post<Conocimiento>('/agente/conocimiento', p).then((r) => r.data),
  actualizarConocimiento: (id: number, p: PedidoConocimiento) =>
    api.put<Conocimiento>(`/agente/conocimiento/${id}`, p).then((r) => r.data),
  eliminarConocimiento: (id: number) => api.delete(`/agente/conocimiento/${id}`).then(() => undefined),

  canales: () => api.get<CanalBot[]>('/agente/canales').then((r) => r.data),
  pausarCanal: (id: number) => api.post<CanalBot>(`/agente/canales/${id}/pausar`).then((r) => r.data),
  reanudarCanal: (id: number) => api.post<CanalBot>(`/agente/canales/${id}/reanudar`).then((r) => r.data),
  desconectarCanal: (id: number) => api.post<CanalBot>(`/agente/canales/${id}/desconectar`).then((r) => r.data),

  vinculacion: () => api.get<EstadoVinculacion>('/agente/interno/vinculacion').then((r) => r.data),
  generarCodigo: () => api.post<CodigoVinculacion>('/agente/interno/vinculacion').then((r) => r.data),
  revocarVinculacion: () => api.delete('/agente/interno/vinculacion').then(() => undefined),
  definirPin: (pin: string) => api.put('/agente/interno/vinculacion/pin', { pin }).then(() => undefined),
  equipo: () => api.get<MiembroVinculado[]>('/agente/interno/vinculacion/equipo').then((r) => r.data),
  revocarMiembro: (usuarioId: number) =>
    api.delete(`/agente/interno/vinculacion/equipo/${usuarioId}`).then(() => undefined),

  simular: (mensaje: string, historial: TurnoSimulador[]) =>
    api.post<ResultadoSimulador>('/agente/simulador', { mensaje, historial }).then((r) => r.data),

  leads: (f: { tipo: TipoLead | ''; estado: EstadoLead | ''; page: number; size: number }) => {
    const params: Record<string, string | number> = { page: f.page, size: f.size }
    if (f.tipo) params.tipo = f.tipo
    if (f.estado) params.estado = f.estado
    return api.get<Lead[]>('/agente/leads', { params }).then((r) => r.data)
  },
  lead: (id: number) => api.get<Lead>(`/agente/leads/${id}`).then((r) => r.data),
}
