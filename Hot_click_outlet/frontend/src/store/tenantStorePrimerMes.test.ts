import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/services/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }))

import useTenantStore from './tenantStore'

describe('tenantStore: primerMesGratisDisponible', () => {
  beforeEach(() => { useTenantStore.getState().clear(); get.mockReset() })

  it('por defecto es false (nada se promete antes de cargar)', () => {
    expect(useTenantStore.getState().primerMesGratisDisponible).toBe(false)
  })
  it('true solo si /tenant/info manda exactamente true', async () => {
    get.mockResolvedValue({ data: { planNombre: 'EMPRENDEDOR', primerMesGratisDisponible: true } })
    await useTenantStore.getState().loadTenantInfo()
    expect(useTenantStore.getState().primerMesGratisDisponible).toBe(true)
  })
  it('false o ausente en /tenant/info → false', async () => {
    get.mockResolvedValue({ data: { primerMesGratisDisponible: false } })
    await useTenantStore.getState().loadTenantInfo()
    expect(useTenantStore.getState().primerMesGratisDisponible).toBe(false)
    useTenantStore.getState().clear()
    get.mockResolvedValue({ data: {} })
    await useTenantStore.getState().loadTenantInfo()
    expect(useTenantStore.getState().primerMesGratisDisponible).toBe(false)
  })
  it('clear (logout) lo reinicia', async () => {
    get.mockResolvedValue({ data: { primerMesGratisDisponible: true } })
    await useTenantStore.getState().loadTenantInfo()
    useTenantStore.getState().clear()
    expect(useTenantStore.getState().primerMesGratisDisponible).toBe(false)
  })
})
