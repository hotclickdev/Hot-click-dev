import api from './api'

export type SolicitudEspecialPayload = {
  nombre: string
  whatsapp: string
  correo?: string
  descripcion?: string
  imagen?: File | null
  empresaSlug?: string
  turnstileToken?: string
}

/** POST multipart a /api/public/solicitud-especial (turnstileToken como RequestParam). */
export function enviarSolicitudEspecial(payload: SolicitudEspecialPayload) {
  const formData = new FormData()
  formData.append('nombre', payload.nombre)
  formData.append('whatsapp', payload.whatsapp)
  if (payload.correo) formData.append('correo', payload.correo)
  if (payload.descripcion) formData.append('descripcion', payload.descripcion)
  if (payload.imagen) formData.append('imagen', payload.imagen)
  formData.append('empresaSlug', payload.empresaSlug ?? 'hotclick')
  if (payload.turnstileToken) formData.append('turnstileToken', payload.turnstileToken)

  return api.post('/public/solicitud-especial', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
