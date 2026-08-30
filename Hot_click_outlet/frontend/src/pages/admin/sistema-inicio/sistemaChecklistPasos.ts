import {
  puedePublicarTienda,
  tiendaEsPublica,
  RUTA_SISTEMA_MARCA,
  RUTA_SISTEMA_VISIBILIDAD,
} from '../../../utils/rutaTienda'

export type ChecklistCtx = {
  dismissed?: boolean
  totalProductos?: number | null
  estadoEmpresa?: string | null
  visibilidadPublica?: boolean | null
}

export type PasoChecklist = {
  id: string
  label: string
  to: string
  hecho: boolean
  primario: boolean
  opcional?: boolean
}

function empresaDesdeCtx(ctx: ChecklistCtx) {
  return {
    estadoEmpresa: ctx.estadoEmpresa ?? undefined,
    visibilidadPublica: ctx.visibilidadPublica ?? undefined,
  }
}

export function tieneProductoCatalogo(ctx: ChecklistCtx) {
  return (ctx.totalProductos ?? 0) > 0
}

/**
 * Checklist visible hasta dismiss, o mientras falte producto o publicar.
 * Si aún no llegó el perfil, no ocultar (evita perder “Publicá tu tienda”).
 */
export function debeMostrarChecklist(ctx: ChecklistCtx) {
  if (ctx.dismissed) return false
  if (!tieneProductoCatalogo(ctx)) return true
  if (ctx.estadoEmpresa == null || ctx.visibilidadPublica == null) return true
  return puedePublicarTienda(empresaDesdeCtx(ctx))
}

export function construirPasosChecklist(ctx: ChecklistCtx): PasoChecklist[] {
  const conProducto = tieneProductoCatalogo(ctx)
  const puedePublicar = puedePublicarTienda(empresaDesdeCtx(ctx))
  const publicada = tiendaEsPublica(empresaDesdeCtx(ctx))
  const perfilListo = ctx.estadoEmpresa != null && ctx.visibilidadPublica != null
  const primarioId = idPasoPrimario({ conProducto, puedePublicar, publicada, perfilListo })

  return [
    paso('producto', 'Agregar un producto', '/admin/productos/nuevo', conProducto, primarioId),
    paso('marca', 'Completar marca', RUTA_SISTEMA_MARCA, false, primarioId),
    // Siempre listado: no depende del timing de /empresa/perfil
    paso(
      'publicar',
      publicada ? 'Tienda publicada' : 'Publicá tu tienda',
      RUTA_SISTEMA_VISIBILIDAD,
      publicada,
      primarioId,
    ),
    {
      ...paso('plan', 'Ver tu plan', '/admin/billing/planes', false, primarioId),
      opcional: true,
    },
  ]
}

function idPasoPrimario({
  conProducto,
  puedePublicar,
  publicada,
  perfilListo,
}: {
  conProducto: boolean
  puedePublicar: boolean
  publicada: boolean
  perfilListo: boolean
}) {
  if (!conProducto) return 'producto'
  if (publicada) return 'marca'
  // Primario si puede publicar, o si el perfil aún no llegó (mismo CTA que AccesoTiendaPublica)
  if (puedePublicar || !perfilListo) return 'publicar'
  return 'marca'
}

function paso(id: string, label: string, to: string, hecho: boolean, primarioId: string): PasoChecklist {
  return {
    id,
    label,
    to,
    hecho,
    primario: id === primarioId && !hecho,
  }
}
