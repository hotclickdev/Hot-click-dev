import api from './api'
import type { JsonBody } from '@/types/api'

/** Body parcial para PUT /empresa/perfil (solo campos enviados se actualizan). */
export type EmpresaPerfilUpdate = {
  nombreComercial?: string
  descripcion?: string
  telefonoEmpresa?: string
  correoEmpresa?: string
  numeroWhatsapp?: string
  categoriaNegocio?: string
  instagram?: string
  zonaEnvio?: string
  colorPrimario?: string
  colorSecundario?: string
  colorAcento?: string
  logoUrl?: string
  tagline?: string
  footerTexto?: string
}

/** Perfil de la empresa del usuario autenticado (emprendedor). */
export const empresaService = {
  getPerfil: () => api.get('/empresa/perfil'),
  updatePerfil: (body: EmpresaPerfilUpdate | JsonBody) => api.put('/empresa/perfil', body),
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
