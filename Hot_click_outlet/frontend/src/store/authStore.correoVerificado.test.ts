import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/sentryClient', () => ({ syncSentryUser: vi.fn() }))
vi.mock('@/utils/analytics', () => ({ identifyUser: vi.fn(), resetAnalyticsUser: vi.fn() }))

import useAuthStore from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'

function auth(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    accessToken: 'header.' + btoa(JSON.stringify({ rol: 'EMPRENDEDOR' })) + '.sig',
    id: 1138,
    correo: 'qa.sim.post544.20261109@hotclick.test',
    rol: 'EMPRENDEDOR',
    ...overrides,
  }
}

describe('authStore no asume el correo verificado', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('el estado inicial y el logout quedan en no verificado', () => {
    expect(useAuthStore.getState().correoVerificado).toBe(false)
  })

  it('si el servidor no manda el campo, no queda verificado', () => {
    useAuthStore.getState().login(auth())
    expect(useAuthStore.getState().correoVerificado).toBe(false)
  })

  it('respeta false y true del servidor', () => {
    useAuthStore.getState().login(auth({ correoVerificado: false }))
    expect(useAuthStore.getState().correoVerificado).toBe(false)
    useAuthStore.getState().login(auth({ correoVerificado: true }))
    expect(useAuthStore.getState().correoVerificado).toBe(true)
  })
})
