import {
  puedePublicarTienda,
  tiendaEsPublica,
  RUTA_SISTEMA_MARCA,
  RUTA_SISTEMA_VISIBILIDAD,
} from '../../../utils/rutaTienda.js'

/**
 * @param {{ totalProductos?: number|null, estadoEmpresa?: string|null, visibilidadPublica?: boolean|null }} ctx
 */
export function tieneProductoCatalogo(ctx) {
  return (ctx.totalProductos ?? 0) > 0
}

/**
 * Checklist visible hasta dismiss, o mientras falte producto o publicar.
 * Si aún no llegó el perfil, no ocultar (evita perder “Publicá tu tienda”).
 * @param {{ dismissed: boolean, totalProductos?: number|null, estadoEmpresa?: string|null, visibilidadPublica?: boolean|null }} ctx
 */
export function debeMostrarChecklist(ctx) {
  if (ctx.dismissed) return false
  if (!tieneProductoCatalogo(ctx)) return true
  if (ctx.estadoEmpresa == null || ctx.visibilidadPublica == null) return true
  return puedePublicarTienda(ctx)
}

/**
 * @param {{ totalProductos?: number|null, estadoEmpresa?: string|null, visibilidadPublica?: boolean|null }} ctx
 * @returns {{ id: string, label: string, to: string, hecho: boolean, primario: boolean, opcional?: boolean }[]}
 */
export function construirPasosChecklist(ctx) {
  const conProducto = tieneProductoCatalogo(ctx)
  const puedePublicar = puedePublicarTienda(ctx)
  const publicada = tiendaEsPublica(ctx)
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

function idPasoPrimario({ conProducto, puedePublicar, publicada, perfilListo }) {
  if (!conProducto) return 'producto'
  if (publicada) return 'marca'
  // Primario si puede publicar, o si el perfil aún no llegó (mismo CTA que AccesoTiendaPublica)
  if (puedePublicar || !perfilListo) return 'publicar'
  return 'marca'
}

function paso(id, label, to, hecho, primarioId) {
  return {
    id,
    label,
    to,
    hecho,
    primario: id === primarioId && !hecho,
  }
}
