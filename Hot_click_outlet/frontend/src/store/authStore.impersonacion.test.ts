import '@/test-utils/memoriaLocalStorage'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/sentryClient', () => ({
  syncSentryUser: vi.fn(),
}))
vi.mock('@/utils/analytics', () => ({
  identifyUser: vi.fn(),
  resetAnalyticsUser: vi.fn(),
}))

import useAuthStore from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'

function authData(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    accessToken: 'header.' + btoa(JSON.stringify({ rol: 'ADMIN', userId: 1 })) + '.sig',
    id: 1,
    correo: 'andres@hotclick.cr',
    rol: 'ADMIN',
    nombre: 'Andrés',
    empresaId: null,
    empresaSlug: null,
    empresaNombre: null,
    permisos: [],
    ...overrides,
  }
}

describe('authStore impersonación', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      userId: null,
      userEmail: null,
      userRole: null,
      userName: null,
      empresaId: null,
      empresaSlug: null,
      empresaNombre: null,
      permissions: [],
      roles: [],
      impersonando: false,
      adminOriginal: null,
    })
  })

  it('impersonar guarda sesión admin y no cambia identidad; sí el tenant', () => {
    useAuthStore.getState().login(authData())
    useAuthStore.getState().impersonar({
      accessToken: 'imp.token',
      id: 1,
      correo: 'andres@hotclick.cr',
      rol: 'EMPRENDEDOR',
      nombre: 'Andrés',
      empresaId: 55,
      empresaSlug: 'hotclick2',
      empresaNombre: 'HotClick2',
      permisos: [],
    })

    const s = useAuthStore.getState()
    expect(s.impersonando).toBe(true)
    expect(s.userId).toBe(1)
    expect(s.userEmail).toBe('andres@hotclick.cr')
    expect(s.userName).toBe('Andrés')
    expect(s.userRole).toBe('EMPRENDEDOR')
    expect(s.empresaId).toBe(55)
    expect(s.empresaSlug).toBe('hotclick2')
    expect(s.empresaNombre).toBe('HotClick2')
    expect(s.adminOriginal?.userRole).toBe('ADMIN')
    expect(s.adminOriginal?.token).toBeTruthy()
  })

  it('salirImpersonacion restaura la sesión ADMIN', () => {
    useAuthStore.getState().login(authData())
    useAuthStore.getState().impersonar({
      accessToken: 'imp.token',
      rol: 'EMPRENDEDOR',
      empresaId: 55,
      empresaSlug: 'hotclick2',
      empresaNombre: 'HotClick2',
    })
    useAuthStore.getState().salirImpersonacion()

    const s = useAuthStore.getState()
    expect(s.impersonando).toBe(false)
    expect(s.adminOriginal).toBeNull()
    expect(s.userRole).toBe('ADMIN')
    expect(s.empresaId).toBeNull()
  })

  it('login y logout limpian flags de impersonación', () => {
    useAuthStore.getState().login(authData())
    useAuthStore.getState().impersonar({
      accessToken: 'imp.token',
      rol: 'EMPRENDEDOR',
      empresaId: 55,
    })
    useAuthStore.getState().login(authData({ accessToken: 'new.admin.token' }))
    expect(useAuthStore.getState().impersonando).toBe(false)
    expect(useAuthStore.getState().adminOriginal).toBeNull()

    useAuthStore.getState().impersonar({
      accessToken: 'imp2',
      rol: 'EMPRENDEDOR',
      empresaId: 9,
    })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().impersonando).toBe(false)
    expect(useAuthStore.getState().adminOriginal).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('no persiste refreshToken en el estado (solo cookie HttpOnly)', () => {
    useAuthStore.getState().login(authData({ refreshToken: 'should-not-store' }))
    expect(useAuthStore.getState()).not.toHaveProperty('refreshToken')
  })
  it('impersonar arranca en solo lectura; habilitar escritura cambia token y modo; salir limpia', () => {
    useAuthStore.getState().login(authData())
    useAuthStore.getState().impersonar({ accessToken: 'imp.lectura', rol: 'EMPRENDEDOR', empresaId: 7 })
    expect(useAuthStore.getState().impersonacionModo).toBe('LECTURA')

    useAuthStore.getState().habilitarEscrituraImpersonacion('imp.escritura', 1_700_000_000_000)
    expect(useAuthStore.getState().token).toBe('imp.escritura')
    expect(useAuthStore.getState().impersonacionModo).toBe('ESCRITURA')
    expect(useAuthStore.getState().impersonacionEscrituraHasta).toBe(1_700_000_000_000)

    useAuthStore.getState().salirImpersonacion()
    expect(useAuthStore.getState().impersonacionModo).toBeNull()
    expect(useAuthStore.getState().impersonacionEscrituraHasta).toBeNull()
  })

  it('habilitar escritura sin sesión de soporte no cambia nada', () => {
    useAuthStore.getState().login(authData({ accessToken: 'admin.token' }))
    useAuthStore.getState().habilitarEscrituraImpersonacion('otro', null)
    expect(useAuthStore.getState().token).toBe('admin.token')
    expect(useAuthStore.getState().impersonacionModo).toBeNull()
  })

  it('H-01: adminOriginal (token del admin) nunca llega a localStorage durante la impersonación', () => {
    useAuthStore.getState().login(authData({ accessToken: 'admin.secreto' }))
    useAuthStore.getState().impersonar({ accessToken: 'imp.token', rol: 'EMPRENDEDOR', empresaId: 7 })
    expect(useAuthStore.getState().adminOriginal?.token).toBe('admin.secreto') // en memoria sí
    const raw = localStorage.getItem('hotclick-auth') ?? ''
    expect(raw).not.toContain('admin.secreto')
    expect(JSON.parse(raw).state).not.toHaveProperty('adminOriginal')
  })

  it('H-01: tras recargar (sin adminOriginal en memoria) salir de la impersonación cierra la sesión', () => {
    useAuthStore.setState({ impersonando: true, token: 'imp.token', userRole: 'EMPRENDEDOR', adminOriginal: null })
    useAuthStore.getState().salirImpersonacion()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().impersonando).toBe(false)
  })

  it('H-01: migra el almacenamiento v0 descartando adminOriginal', async () => {
    const opts = useAuthStore.persist.getOptions()
    const migrado = await opts.migrate!({ token: 't', adminOriginal: { token: 'admin.secreto' } }, 0) as Record<string, unknown>
    expect(migrado).not.toHaveProperty('adminOriginal')
    expect(migrado.token).toBe('t')
    expect(opts.version).toBe(1)
  })
})
