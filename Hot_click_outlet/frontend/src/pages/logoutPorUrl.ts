/** Destino tras cerrar sesión: el mismo que usa el botón «Cerrar sesión» de /perfil. */
export const DESTINO_TRAS_LOGOUT = '/'

export interface AccionesLogout {
  haySesion: boolean
  revocar: () => Promise<unknown>
  cerrarLocal: () => void
  avisar: () => void
  navegar: (destino: string) => void
}

/**
 * Lógica pura de /logout: revoca la cookie de refresh en el servidor (si no, el refresh reabre la sesión),
 * limpia la sesión local, avisa y redirige con replace. Sin sesión solo redirige.
 */
export function cerrarSesionPorUrl(a: AccionesLogout): void {
  if (a.haySesion) {
    a.revocar().catch(() => { /* la sesión local se cierra igual */ })
    a.cerrarLocal()
    a.avisar()
  }
  a.navegar(DESTINO_TRAS_LOGOUT)
}
