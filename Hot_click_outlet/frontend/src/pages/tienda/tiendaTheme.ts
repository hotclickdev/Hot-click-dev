import type { EmpresaTiendaPublica } from '@/types/tienda'
import type { CSSProperties } from 'react'

/**
 * Colores de marca del vendedor. Los neutros viven en `.hc-tenant-theme`.
 */
export function estiloMarcaTienda(empresa: EmpresaTiendaPublica | null): CSSProperties {
  return {
    '--t-primary': empresa?.colorPrimario ?? '#E73B33',
    '--t-secondary': empresa?.colorSecundario ?? '#152B5E',
    '--t-accent': empresa?.colorAcento ?? '#1747A8',
  } as CSSProperties
}

export const CLASE_TARJETA_TIENDA =
  'rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] shadow-sm'

export const CLASE_INPUT_TIENDA =
  'w-full border border-[var(--t-border)] rounded-lg px-3 py-2 text-sm min-h-[44px] bg-[var(--t-surface)] text-[var(--t-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--t-accent)]'
