import type { EmpresaSolicitud } from '../aprobaciones/aprobacionesHelpers'
import { ESTADO_PENDIENTE, listaDesdeRespuesta } from '../aprobaciones/aprobacionesHelpers'

export type AlertaSistema = {
  id: string
  titulo: string
  cuerpo: string
  to: string
  tono: 'danger' | 'warn' | 'muted'
}

export function alertasDesdeColas(productosData: unknown, empresasData: unknown): AlertaSistema[] {
  const productos = listaDesdeRespuesta(productosData).length
  const tiendas = listaDesdeRespuesta<EmpresaSolicitud>(empresasData)
    .filter((empresa) => empresa.estadoEmpresa === ESTADO_PENDIENTE).length
  const alertas: AlertaSistema[] = []
  if (productos > 0) {
    alertas.push({
      id: 'productos',
      titulo: `${productos} productos esperando revisión`,
      cuerpo: 'Hay publicaciones pendientes de moderación.',
      to: '/admin/aprobaciones',
      tono: 'warn',
    })
  }
  if (tiendas > 0) {
    alertas.push({
      id: 'tiendas',
      titulo: `${tiendas} tiendas pendientes de aprobación`,
      cuerpo: 'Hay negocios nuevos esperando activarse en la plataforma.',
      to: '/admin/aprobaciones',
      tono: 'danger',
    })
  }
  return alertas
}
