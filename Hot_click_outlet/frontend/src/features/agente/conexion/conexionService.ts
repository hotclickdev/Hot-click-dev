import api from '@/services/api'
import type { ConfigConexion, PaginaMeta, ResultadoConexion, SesionWhatsapp } from './conexionTypes'

/** Todas las llamadas van al servidor propio: el intercambio del código por el token nunca ocurre en el navegador. */
export const conexionService = {
  config: () => api.get<ConfigConexion>('/agente/conexion/config').then((r) => r.data),
  conectarWhatsapp: (s: SesionWhatsapp) =>
    api.post<ResultadoConexion>('/agente/conexion/whatsapp', s).then((r) => r.data),
  listarPaginas: (accessToken: string) =>
    api.post<PaginaMeta[]>('/agente/conexion/meta-paginas/listar', { accessToken }).then((r) => r.data),
  conectarPagina: (accessToken: string, paginaId: string) =>
    api.post<ResultadoConexion>('/agente/conexion/meta-paginas', { accessToken, paginaId }).then((r) => r.data),
}
