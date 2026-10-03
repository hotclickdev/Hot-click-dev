import { createContext, useContext } from 'react'
import { esRutaVisitante } from '@/components/ui/flotantes/flotantesHelpers'
import { esRutaClaudeclick } from '@/utils/rutaPrototipo'

/**
 * Variante de las piezas ⚠️ COMPARTIDAS de `components/ui` (`Modal`, `ConfirmModal`, `Toast`, `Input`, `Button`,
 * `PageProgressBar`). `figma` = manual de marca, solo en rutas del visitante; `clasica` = el estilo de siempre.
 * Sin proveedor (tests, paneles, POS) la variante es `clasica`: los paneles de emprendedor, admin, Pyme y
 * Negocio Plus no cambian. El proveedor está en `VarianteVisitanteProvider.tsx`.
 */
export type VariantePieza = 'figma' | 'clasica'

/**
 * Ruta + rol → variante. `/perfil` también la abre un emprendedor o un admin: ahí solo el comprador
 * (`USUARIO_FINAL`) o alguien sin sesión ve Figma, igual que `PiezasModalCuenta`.
 */
export function varianteDeRuta(pathname: string, rol?: string | null): VariantePieza {
  if (!esRutaVisitante(pathname, esRutaClaudeclick(pathname))) return 'clasica'
  if ((pathname === '/perfil' || pathname.startsWith('/perfil/')) && rol && rol !== 'USUARIO_FINAL') return 'clasica'
  return 'figma'
}

export const VarianteContext = createContext<VariantePieza>('clasica')

/** La prop explícita gana; si no hay, la de la ruta (o `clasica` sin proveedor). */
export function useVariantePieza(variante?: VariantePieza): VariantePieza {
  const deRuta = useContext(VarianteContext)
  return variante ?? deRuta
}

/**
 * Color de la barra. ⚠️ COMPARTIDO: `clasica` (paneles) es la de siempre, roja con brillo; `figma` (visitante)
 * es una línea azul b600 sin brillo (Figma no tiene barra: se deriva del color de acentos del manual).
 */
export function colorBarra(variante: VariantePieza): { background: string; boxShadow: string } {
  if (variante === 'figma') return { background: 'var(--hc-blue-600)', boxShadow: 'none' }
  return { background: 'var(--hc-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--hc-primary) 45%, transparent)' }
}
