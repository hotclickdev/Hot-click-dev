import api from './api'
import type { AgentesInspectResult, AgentesSnapshot, CatalogFile, InspectionsFile, OlasFile } from '@/types/agentes'

/** Catálogo I1 de agentes de ingeniería (ADMIN). */
export const agentesService = {
  snapshot: () => api.get<AgentesSnapshot>('/admin/agentes'),
  catalogo: () => api.get<CatalogFile>('/admin/agentes/catalogo'),
  olas: () => api.get<OlasFile>('/admin/agentes/olas'),
  inspecciones: () => api.get<InspectionsFile>('/admin/agentes/inspecciones'),
  correrInspector: () => api.post<AgentesInspectResult>('/admin/agentes/inspecciones'),
}
