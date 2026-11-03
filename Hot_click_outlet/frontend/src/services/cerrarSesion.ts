import { authService } from './authService'

export interface PasosCierreSesion {
  /** Access token capturado ANTES de limpiar el store. */
  token: string | null | undefined
  cerrarLocal: () => void
  avisar?: () => void
  navegar: (destino: string) => void
  destino?: string
}

/**
 * Cierre de sesión único para /logout, el botón de /perfil y los paneles: primero revoca en el servidor con el
 * Bearer explícito y espera la respuesta; recién después limpia la sesión local. Si el servidor falla, la sesión
 * local se cierra igual.
 */
export async function cerrarSesionCompleta(p: PasosCierreSesion): Promise<void> {
  if (p.token) {
    await authService.logout(null, p.token).catch(() => { /* la sesión local se cierra igual */ })
  }
  p.cerrarLocal()
  p.avisar?.()
  p.navegar(p.destino ?? '/')
}
