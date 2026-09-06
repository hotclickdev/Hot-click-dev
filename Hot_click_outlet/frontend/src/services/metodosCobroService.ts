import api from '@/services/api'
import type { MetodoCobro, TipoMetodoCobro } from '@/prototipo/compartido/metodosCobroDatos'

/** Shape del backend `/api/metodos-cobro` (ResponseDTO ya unwrapped por axios). */
export type MetodoCobroApi = {
  id: number
  tipo: TipoMetodoCobro
  nombre: string
  mascara: string
  nota: string
  predeterminado: boolean
  enRevision?: boolean
}

export function mapMetodoCobroApi(m: MetodoCobroApi): MetodoCobro {
  return {
    id: String(m.id),
    tipo: m.tipo,
    nombre: m.nombre,
    mascara: m.mascara,
    nota: m.nota,
    predeterminado: m.predeterminado,
    enRevision: Boolean(m.enRevision),
  }
}

export const metodosCobroService = {
  listar: () => api.get<MetodoCobroApi[]>('/metodos-cobro'),
  crear: (tipo: TipoMetodoCobro, dato: string) =>
    api.post<MetodoCobroApi>('/metodos-cobro', { tipo, dato }),
  marcarPredeterminado: (id: string | number) =>
    api.put<MetodoCobroApi>(`/metodos-cobro/${id}/predeterminado`),
  solicitarCambio: (id: string | number, tipo: TipoMetodoCobro, dato: string) =>
    api.put<MetodoCobroApi>(`/metodos-cobro/${id}`, { tipo, dato }),
}
