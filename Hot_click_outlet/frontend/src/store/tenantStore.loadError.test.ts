import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
vi.mock('@/services/api', () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}))

import useTenantStore from '@/store/tenantStore'

describe('tenantStore loadError', () => {
  beforeEach(() => {
    getMock.mockReset()
    useTenantStore.getState().clear()
  })

  it('marca loadError y no habilita features si /tenant/info falla', async () => {
    getMock.mockRejectedValueOnce(new Error('network'))

    await useTenantStore.getState().loadTenantInfo()

    const state = useTenantStore.getState()
    expect(state.loadError).toBe(true)
    expect(state.hasFeature('pos')).toBe(false)
  })

  it('reintento exitoso limpia loadError', async () => {
    getMock.mockRejectedValueOnce(new Error('network'))
    await useTenantStore.getState().loadTenantInfo()

    getMock.mockResolvedValueOnce({ data: { planNombre: 'PYME', features: { pos: true } } })
    await useTenantStore.getState().loadTenantInfo()

    const state = useTenantStore.getState()
    expect(state.loadError).toBe(false)
    expect(state.hasFeature('pos')).toBe(true)
  })
})
