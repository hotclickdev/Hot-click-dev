import api from './api'

/** Perfil de la empresa del usuario autenticado (emprendedor). */
export const empresaService = {
  getPerfil: () => api.get('/empresa/perfil'),
  updatePerfil: (body) => api.put('/empresa/perfil', body),
  uploadLogo: (formData) =>
    api.post('/empresa/perfil/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  setVisibilidad: (visibilidadPublica) =>
    api.put('/empresa/perfil/visibilidad', { visibilidadPublica }),
  uploadCertP12: (formData) =>
    api.post('/empresa/perfil/cert-p12', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateFiscal: (body) => api.put('/empresa/perfil/fiscal', body),
}
