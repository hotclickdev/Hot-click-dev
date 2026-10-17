import { beforeEach, describe, expect, it, vi } from 'vitest'

const put = vi.fn((...a: unknown[]) => a && Promise.resolve({ data: { success: true, data: { cobrosPausados: true } } }))
vi.mock('@/services/api', () => ({ default: { put: (...a: unknown[]) => put(...a) } }))

describe('S3-22 pausa de cobros contra el endpoint real (#154)', () => {
  beforeEach(() => put.mockClear())

  it('pausar usa PUT /admin/empresas/{id}/cobros-pausados con cobrosPausados: true y el motivo', async () => {
    const { adminOnvoApi } = await import('./adminOnvoApi')
    await adminOnvoApi.pausar(12, 'Fotos con marcas')
    expect(put).toHaveBeenCalledWith('/admin/empresas/12/cobros-pausados', { cobrosPausados: true, motivo: 'Fotos con marcas' })
  })

  it('reanudar usa el mismo endpoint con cobrosPausados: false', async () => {
    const { adminOnvoApi } = await import('./adminOnvoApi')
    await adminOnvoApi.reanudar(12)
    expect(put).toHaveBeenCalledWith('/admin/empresas/12/cobros-pausados', { cobrosPausados: false })
  })
})
