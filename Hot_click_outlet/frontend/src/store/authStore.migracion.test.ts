import '@/test-utils/memoriaLocalStorage'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/utils/sentryClient', () => ({ syncSentryUser: vi.fn() }))
vi.mock('@/utils/analytics', () => ({ identifyUser: vi.fn(), resetAnalyticsUser: vi.fn() }))
localStorage.setItem('hotclick-auth', JSON.stringify({ version: 0, state: { token: 't.soporte', impersonando: true, adminOriginal: { token: 'admin.viejo', userRole: 'ADMIN' } } }))
describe('SEC migración v0→v1', () => {
  it('borra adminOriginal de memoria y de localStorage', async () => {
    const { default: useAuthStore } = await import('@/store/authStore')
    await new Promise(r => setTimeout(r, 20))
    expect(useAuthStore.getState().adminOriginal ?? null).toBeNull()
    const raw = localStorage.getItem('hotclick-auth')!
    expect(raw).not.toContain('admin.viejo')
    expect(JSON.parse(raw).version).toBe(1)
  })
})
