import { cerrarSesionCompleta } from '@/services/cerrarSesion'

/** Destino tras cerrar sesión: el mismo que usa el botón «Cerrar sesión» de /perfil. */
export const DESTINO_TRAS_LOGOUT = '/'

export interface AccionesLogout {
  token: string | null | undefined
  cerrarLocal: () => void
  avisar: () => void
  navegar: (destino: string) => void
}

/** /logout por URL: con sesión revoca (con Bearer, esperando) y cierra; sin sesión solo redirige. */
export function cerrarSesionPorUrl(a: AccionesLogout): Promise<void> {
  if (!a.token) {
    a.navegar(DESTINO_TRAS_LOGOUT)
    return Promise.resolve()
  }
  return cerrarSesionCompleta({ ...a, destino: DESTINO_TRAS_LOGOUT })
}
