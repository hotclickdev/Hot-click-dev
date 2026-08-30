import { VISITANTE_BASE, visitanteRuta } from './visitanteMock'

export { VISITANTE_BASE, visitanteRuta }

const RUTAS_SIN_NAV = new Set([
  `${VISITANTE_BASE}/asistente`,
  `${VISITANTE_BASE}/asesor-ia`,
  `${VISITANTE_BASE}/checkout`,
  `${VISITANTE_BASE}/compra-confirmada`,
  `${VISITANTE_BASE}/pago-fallido`,
  `${VISITANTE_BASE}/pedidos`,
  `${VISITANTE_BASE}/direcciones`,
  `${VISITANTE_BASE}/metodos-pago`,
  `${VISITANTE_BASE}/ayuda`,
])

/** Bottom nav Figma; sin nav en PDP, checkout y cuenta secundaria. */
export function visitanteMuestraNav(pathname: string): boolean {
  if (pathname.startsWith(`${VISITANTE_BASE}/producto/`)) return false
  if (pathname.startsWith(`${VISITANTE_BASE}/negocio/`)) return false
  if (RUTAS_SIN_NAV.has(pathname)) return false
  return pathname === VISITANTE_BASE || pathname.startsWith(`${VISITANTE_BASE}/`)
}
