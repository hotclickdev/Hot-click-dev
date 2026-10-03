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
