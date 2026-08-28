import api from './api'
import type { JsonBody } from '@/types/api'

/** Perfil de la empresa del usuario autenticado (emprendedor). */
export const empresaService = {
  getPerfil: () => api.get('/empresa/perfil'),
  updatePerfil: (body: JsonBody) => api.put('/empresa/perfil', body),
  uploadLogo: (formData: FormData) =>
    api.post('/empresa/perfil/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  setVisibilidad: (visibilidadPublica: boolean) =>
    api.put('/empresa/perfil/visibilidad', { visibilidadPublica }),
  uploadCertP12: (formData: FormData) =>
    api.post('/empresa/perfil/cert-p12', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateFiscal: (body: JsonBody) => api.put('/empresa/perfil/fiscal', body),
}
