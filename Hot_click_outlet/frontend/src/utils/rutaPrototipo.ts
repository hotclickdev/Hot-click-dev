/** Rutas del prototipo CLAUDECLICK (`/prototipo` y `/prototipo/:rol/...`). */
export function esRutaPrototipo(pathname: string) {
  return pathname === '/prototipo' || pathname.startsWith('/prototipo/')
}
