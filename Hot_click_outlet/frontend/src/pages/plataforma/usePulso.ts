import { useEffect, useState } from 'react'
import { adminService, orderService } from '@/services/orderService'
import { auditoriaAdminService } from '@/services/auditoriaAdminService'
import { embudoService } from '@/services/embudoService'
import { securityService } from '@/services/securityService'
import { filasDe, texto, type Fila } from './normalizar'

export type Pulso = {
  visitas: number | null
  producto: number | null
  carrito: number | null
  pago: number | null
  pedidos: number | null
  alertas: number | null
  activos: number | null
  revision: number | null
  suspendidos: number | null
  actividad: string[]
  tiendas: Fila[]
}

export function usePulso(dias: 7 | 30) {
  const [pulso, setPulso] = useState<Pulso | null>(null)
  useEffect(() => {
    let vivo = true
    armarPulso(dias).then((siguiente) => { if (vivo) setPulso(siguiente) })
    return () => { vivo = false }
  }, [dias])
  return pulso
}

async function armarPulso(dias: 7 | 30): Promise<Pulso> {
  const [embudo, pedidos, alertas, empresas, auditoria, eventos] = await Promise.allSettled([
    embudoService.resumen(dias),
    orderService.getPending(),
    securityService.getAlerts(false),
    adminService.getEmpresas({ page: 0, size: 200 }),
    auditoriaAdminService.listar({ page: 0, size: 8 }),
    securityService.getEvents({ page: 0, size: 8, period: dias === 30 ? '30d' : '7d' }),
  ])
  const emb = embudo.status === 'fulfilled' ? embudo.value : null
  const tiendas = empresas.status === 'fulfilled' ? filasDe(empresas.value.data) : []
  return {
    visitas: entero(emb, 'visita'),
    producto: entero(emb, 'producto'),
    carrito: entero(emb, 'carrito'),
    pago: entero(emb, 'pedidosPagados'),
    pedidos: pedidos.status === 'fulfilled' ? filasDe(pedidos.value.data).length : null,
    alertas: alertas.status === 'fulfilled' ? filasDe(alertas.value.data).length : null,
    activos: empresas.status === 'fulfilled' ? contarEstado(tiendas, 'ACTIVO') : null,
    revision: empresas.status === 'fulfilled' ? contarEstado(tiendas, 'PENDIENTE_APROBACION') : null,
    suspendidos: empresas.status === 'fulfilled' ? tiendas.filter((f) => ['SUSPENDIDO', 'INACTIVO', 'RECHAZADO'].includes(texto(f.estadoEmpresa).toUpperCase())).length : null,
    actividad: actividadDe(auditoria, eventos),
    tiendas,
  }
}

function entero(data: unknown, campo: string): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const valor = (data as Record<string, unknown>)[campo]
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function contarEstado(filas: Fila[], estado: string): number {
  return filas.filter((fila) => texto(fila.estadoEmpresa).toUpperCase() === estado).length
}

function actividadDe(
  auditoria: PromiseSettledResult<{ data: unknown }>,
  eventos: PromiseSettledResult<{ data: unknown }>,
): string[] {
  const decisiones = auditoria.status === 'fulfilled' ? filasDe(auditoria.value.data).map(lineaAuditoria) : []
  const accesos = eventos.status === 'fulfilled' ? filasDe(eventos.value.data).map(lineaEvento) : []
  return [...decisiones, ...accesos].filter(Boolean).slice(0, 8)
}

function lineaAuditoria(fila: Fila): string {
  return `${texto(fila.adminEmail, 'Operador')} · ${texto(fila.detalle, texto(fila.accion, 'Decisión'))}`
}

function lineaEvento(fila: Fila): string {
  return texto(fila.message, texto(fila.descripcion, texto(fila.eventType, texto(fila.tipo, ''))))
}
