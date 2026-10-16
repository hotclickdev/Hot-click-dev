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
