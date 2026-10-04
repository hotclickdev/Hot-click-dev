import api from './api'

export type PedidoResumenTitular = {
  numero?: string
  fecha?: string
  total?: number
  estado?: string
}

export type DatosTitular = {
  id?: number
  nombre?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  correo?: string
  telefono?: string
  identificacion?: string
  fechaRegistro?: string
  pedidos?: PedidoResumenTitular[]
}

export const cuentaService = {
  misDatos: () => api.get<DatosTitular>('/cuenta/mis-datos'),
  cerrar: () => api.post('/cuenta/cierre'),
}
