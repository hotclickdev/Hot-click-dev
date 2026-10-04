import useAuthStore from '@/store/authStore'
import { esUsuarioSistema } from '@/utils/sistemaUser'

/**
 * En celular, la caja de un vendedor usa la misma cabecera del panel (A4a).
 * Cajeros, gerentes y supervisores no tienen panel, así que conservan el chrome propio de la caja.
 */
export function useCabeceraPanelEnPos(): boolean {
  return esUsuarioSistema(useAuthStore((s) => s.userRole))
}

/** Clase que oculta en celular lo que la cabecera del panel ya resuelve (tema, logo, volver). */
export function ocultarEnMovilSiHayPanel(conCabeceraPanel: boolean): string {
  return conCabeceraPanel ? 'max-md:hidden' : ''
}
