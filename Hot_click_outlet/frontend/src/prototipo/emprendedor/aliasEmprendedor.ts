import { RUTA_EMPRENDEDOR } from '@/utils/planPaths'

/**
 * ALTO-02: alias legacy `{base}/x` → `{base}/opciones/x`. Destinos ABSOLUTOS: un `<Navigate>` relativo en
 * react-router 7 se resuelve contra la ruta actual (`/emprendedor/plan/opciones/plan`, página vacía).
 */
const ALIAS = [
  'bodegas', 'bodegas/nueva', 'negocio', 'plan', 'plan/actualizado', 'ayuda',
  'consultas', 'perfil', 'cobro', 'cobro/nuevo', 'telegram',
] as const

export const ALIAS_EMPRENDEDOR: ReadonlyArray<{ path: string; destino: string }> = ALIAS.map((path) => ({
  path,
  destino: `${RUTA_EMPRENDEDOR}/opciones/${path}`,
}))
