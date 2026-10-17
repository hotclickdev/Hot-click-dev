import type { ItemContraEntrega } from '@/services/contraEntregaApi'
import { contraEntregaDisponible } from './pagoPrincipal'

type PaqueteContraEntrega = { subtotal: number; items: ItemContraEntrega[] }

export type MotivoSinContraEntrega = 'negocio' | 'minimo' | null

export type EstadoContraEntrega = { disponible: boolean; motivo: MotivoSinContraEntrega }

/**
 * S2 · Contra entrega por negocio (lámina S2-contra-entrega): se ofrece solo si la config global la
 * habilita, todo va por Envío Normal y TODOS los negocios del carrito la aceptan y llegan a su mínimo.
 * Si uno no la acepta, se oculta para todo el pedido y se explica por qué.
 * Sin el campo del negocio (backend actual) se comporta como antes: manda la config global.
 */
export function estadoContraEntrega(
  paquetes: PaqueteContraEntrega[], metodosEnvio: string[], habilitadaGlobal: boolean,
): EstadoContraEntrega {
  if (!contraEntregaDisponible(metodosEnvio, habilitadaGlobal)) return { disponible: false, motivo: null }
  for (const p of paquetes) {
    const datos = p.items.find((i) => i.empresaAceptaContraEntrega !== undefined)
    if (!datos) continue
    if (datos.empresaAceptaContraEntrega !== true) return { disponible: false, motivo: 'negocio' }
    const minimo = datos.empresaContraEntregaMinimo
    if (typeof minimo === 'number' && minimo > 0 && p.subtotal < minimo) return { disponible: false, motivo: 'minimo' }
  }
  return { disponible: true, motivo: null }
}

/** Textos de la lámina; el de «mínimo» está pendiente de decisión de Producto. */
export const AVISO_SIN_CONTRA_ENTREGA: Record<Exclude<MotivoSinContraEntrega, null>, string> = {
  negocio: 'Contra entrega no está disponible porque uno de los negocios de tu carrito no lo acepta.',
  minimo: 'Contra entrega no está disponible porque tu pedido no llega al mínimo de uno de los negocios.',
}

/**
 * Decisión del dueño (16-oct-2026): el cargo de envío contra entrega se cobra por pedido y POR NEGOCIO
 * (no por bodega). El monto llega de la config del checkout (`contraEntregaCargoPorNegocio`); si no
 * viene, no se muestra ningún monto. El total final lo calcula el backend.
 */
type PaqueteNegocio = { bodegaId: string; empresaNombre?: string | null; items: { empresaId?: number | string | null }[] }

export function negociosDelPedido(paquetes: PaqueteNegocio[]): number {
  const claves = new Set(paquetes.map((p) => {
    const id = p.items.find((i) => i.empresaId != null)?.empresaId
    return id != null ? `id:${id}` : p.empresaNombre ? `n:${p.empresaNombre}` : `b:${p.bodegaId}`
  }))
  return claves.size
}

export type CargoContraEntrega = { porNegocio: number; negocios: number; total: number }

export function cargoContraEntrega(paquetes: PaqueteNegocio[], porNegocio: number | null | undefined): CargoContraEntrega | null {
  if (typeof porNegocio !== 'number' || !Number.isFinite(porNegocio) || porNegocio < 0) return null
  const negocios = negociosDelPedido(paquetes)
  return { porNegocio, negocios, total: porNegocio * negocios }
}

export function textoCargoContraEntrega(c: CargoContraEntrega, formato: (n: number) => string): string {
  const base = `Envío contra entrega: ${formato(c.porNegocio)} por negocio`
  return c.negocios > 1 ? `${base} · ${c.negocios} negocios = ${formato(c.total)}` : base
}
