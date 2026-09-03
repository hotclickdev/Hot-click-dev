import type { EmpresaSolicitud } from '../aprobaciones/aprobacionesHelpers'
import { ESTADO_PENDIENTE, listaDesdeRespuesta } from '../aprobaciones/aprobacionesHelpers'

export type AlertaSistema = {
  id: string
  titulo: string
  cuerpo: string
  to: string
  tono: 'danger' | 'warn' | 'muted'
}

/**
 * Alertas de moderación para el panel de sistema.
 * No incluye cola PRODUCTO: ya no hay revisión ítem por ítem;
 * Pausado se gestiona en Empresas y el catálogo se abre al aprobar el negocio.
 */
export function alertasDesdeColas(empresasData: unknown, ofertasCount = 0): AlertaSistema[] {
  const tiendas = listaDesdeRespuesta<EmpresaSolicitud>(empresasData)
    .filter((empresa) => empresa.estadoEmpresa === ESTADO_PENDIENTE).length
  const alertas: AlertaSistema[] = []
  if (tiendas > 0) {
    alertas.push({
      id: 'tiendas',
      titulo: `${tiendas} tiendas pendientes de aprobación`,
      cuerpo: 'Hay negocios nuevos esperando activarse en la plataforma.',
      to: '/admin/aprobaciones',
      tono: 'danger',
    })
  }
  if (ofertasCount > 0) {
    alertas.push({
      id: 'ofertas',
      titulo: `${ofertasCount} promociones esperando revisión`,
      cuerpo: 'Hay ofertas de vendedores pendientes de aprobación.',
      to: '/admin/aprobaciones',
      tono: 'warn',
    })
  }
  return alertas
}
