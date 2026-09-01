import api from './api'
import type { Id } from '@/types/api'

export type Encargo = {
  id: number
  productoId?: number
  productoNombre?: string
  empresaId?: number
  nombreCliente: string
  email: string
  telefono?: string | null
  imagenUrl1?: string | null
  imagenUrl2?: string | null
  imagenUrl3?: string | null
  notas?: string | null
  tallaSeleccionada?: string | null
  modoPrecio: string
  precioCotizado?: number | null
  estado: string
  motivoRechazo?: string | null
  tokenPublico: string
  fechaVencimiento?: string | null
  fechaCreacion?: string
  pedidoId?: number | null
}

export type EncargoCreatePayload = {
  productoId: Id
  nombreCliente: string
  email: string
  telefono?: string
  notas?: string
  tallaSeleccionada?: string
  imagenes: string[]
}

export const encargoService = {
  subirImagen: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ data?: { url?: string }; url?: string } | { url: string }>(
      '/public/encargos/imagenes',
      formData,
      { headers: { 'Content-Type': undefined } },
    )
  },

  crear: (payload: EncargoCreatePayload) =>
    api.post('/public/encargos', payload),

  porToken: (token: string) =>
    api.get(`/public/encargos/${token}`),

  checkout: (token: string, body: { metodoEnvio: string; provider?: string; notas?: string }) =>
    api.post(`/public/encargos/${token}/checkout`, body),

  listar: (estado?: string) =>
    api.get('/encargos', { params: estado ? { estado } : {} }),

  aprobar: (id: Id, precioCotizado: number) =>
    api.put(`/encargos/${id}/aprobar`, { precioCotizado }),

  rechazar: (id: Id, motivoRechazo: string) =>
    api.put(`/encargos/${id}/rechazar`, { motivoRechazo }),
}

export function urlDesdeUploadEncargo(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const body = data as { data?: { url?: unknown }; url?: unknown }
  if (typeof body.data?.url === 'string') return body.data.url
  if (typeof body.url === 'string') return body.url
  return undefined
}

export function encargoDesdeRespuesta(data: unknown): Encargo | null {
  if (!data || typeof data !== 'object') return null
  const body = data as { data?: Encargo }
  return body.data ?? (data as Encargo)
}

export function listaEncargosDesdeRespuesta(data: unknown): Encargo[] {
  if (!data) return []
  if (Array.isArray(data)) return data as Encargo[]
  const body = data as { data?: Encargo[] }
  return Array.isArray(body.data) ? body.data : []
}
