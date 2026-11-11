import { describe, expect, it } from 'vitest'
import { rutaSellerDesdeAdmin } from './planPaths'

// Trazado de la pantalla de planes ACTIVA: los enlaces «Ver planes» van a /admin/billing/planes; AdminRoleSwitch manda
// al vendedor a su prefijo; ahí la ruta «plan» (SellerRoutes) u «opciones/plan» (EmprendedorRoutes) monta
// CompararPlanesVista, que lee GET /api/billing/planes. AdminPlanes (sellerAdminRoutes) no está montado.
describe('/admin/billing/planes → pantalla de planes del vendedor', () => {
  it.each([
    ['EMPRENDEDOR', '/emprendedor/opciones/plan'],
    ['PYME', '/pyme/plan'],
    ['NEGOCIO_PLUS', '/negocio-plus/plan'],
  ])('%s → %s', (plan, destino) => {
    expect(rutaSellerDesdeAdmin('/admin/billing/planes', '', plan)).toBe(destino)
  })
})
