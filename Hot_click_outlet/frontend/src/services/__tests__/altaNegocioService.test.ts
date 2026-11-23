import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('../api', () => ({ default: api }))

import { altaFasesAdminService, altaNegocioService } from '../altaNegocioService'

describe('servicios del alta por fases', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('el panel del dueño nunca manda un id de negocio (la empresa sale del token)', () => {
    altaNegocioService.estado()
    altaNegocioService.enlaceOnvo()
    expect(api.get).toHaveBeenCalledWith('/empresa/alta-negocio/estado')
    expect(api.post).toHaveBeenCalledWith('/empresa/alta-negocio/onvo-enlace')
  })

  it('las vistas admin usan las rutas /admin y marcar reintegrado manda la nota', () => {
    altaFasesAdminService.revision()
    altaFasesAdminService.reintegros()
    altaFasesAdminService.marcarPago(10, 'ref 1')
    altaFasesAdminService.marcarNegocio(3)
    expect(api.get).toHaveBeenCalledWith('/admin/alta-fases/revision')
    expect(api.get).toHaveBeenCalledWith('/admin/reintegros')
    expect(api.post).toHaveBeenCalledWith('/admin/reintegros/pagos/10/reintegrado', { nota: 'ref 1' })
    expect(api.post).toHaveBeenCalledWith('/admin/reintegros/negocios/3/reintegrado', { nota: '' })
  })
})
