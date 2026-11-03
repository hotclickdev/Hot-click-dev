import type { AuthResponse } from '@/types/auth'
import type { Id } from '@/types/api'

export type NegocioMembresia = { id: Id; nombre?: string | null; slug?: string | null; logoUrl?: string | null }

/** Lista de /auth/mis-negocios (ResponseDTO o arreglo directo); descarta entradas sin id. */
export function negociosDe(data: unknown): NegocioMembresia[] {
  const lista = (data as { data?: unknown })?.data ?? data
  return Array.isArray(lista) ? (lista as NegocioMembresia[]).filter((n) => n != null && n.id != null) : []
}

/**
 * QA5 área 2 fila 27: con membresías nunca se empuja a crear otro negocio.
 * 0 → completar registro; 1 → activarla sola; varias → selector.
 */
export function decidirPanelSinNegocio(negocios: NegocioMembresia[]): 'sin-negocio' | 'auto' | 'elegir' {
  if (negocios.length === 0) return 'sin-negocio'
  return negocios.length === 1 ? 'auto' : 'elegir'
}

type DepsActivar = {
  cambiarNegocio: (id: Id) => Promise<{ data: unknown }>
  login: (auth: AuthResponse) => void
  cargarTenant: () => Promise<unknown>
}

/** Activa el negocio con el endpoint existente /auth/cambiar-negocio y guarda la sesión nueva. */
export async function activarNegocio(id: Id, deps: DepsActivar): Promise<AuthResponse> {
  const { data } = await deps.cambiarNegocio(id)
  const auth = ((data as { data?: AuthResponse })?.data ?? data) as AuthResponse
  deps.login(auth)
  if (auth.empresaId) await deps.cargarTenant()
  return auth
}
