import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/sentryClient', () => ({ syncSentryUser: vi.fn() }))
vi.mock('@/utils/analytics', () => ({ identifyUser: vi.fn(), resetAnalyticsUser: vi.fn() }))

import useAuthStore from '@/store/authStore'
import { getAvailableModes } from '@/utils/modes'
import { buildSidebarLinks } from '@/layouts/admin/adminSidebarLinks'
import { rolUiDesdeRespuesta } from '@/utils/rolEquipo'
import type { AuthResponse } from '@/types/auth'

const GLOBALES = ['pos.usar', 'pos.caja.abrir', 'orders.view', 'products.create', 'finances.view']

function resp(o: Partial<AuthResponse>): AuthResponse {
  return {
    accessToken: 'h.' + btoa(JSON.stringify({ rol: 'EMPRENDEDOR', empresaId: 41 })) + '.s',
    id: 7, correo: 'miembro@ejemplo.test', rol: 'EMPRENDEDOR', nombre: 'Miembro',
    empresaId: 41, empresaSlug: 'negocio-ficticio', empresaNombre: 'Negocio Ficticio',
    permisos: GLOBALES, ...o,
  }
}

describe('authStore: rolEquipo y permisosEquipo (cajero de equipo)', () => {
  beforeEach(() => { useAuthStore.getState().logout() })

  it('CAJERO de equipo (rol Spring EMPRENDEDOR): la UI lo trata como CAJERO con permisos solo POS', () => {
    useAuthStore.getState().login(resp({ rolEquipo: 'CAJERO', permisosEquipo: ['pos.usar', 'pos.caja.abrir'] }))
    const s = useAuthStore.getState()
    expect(s.userRole).toBe('CAJERO')
    expect(s.rolEquipo).toBe('CAJERO')
    expect(s.permissions).toEqual(['pos.usar', 'pos.caja.abrir'])
    expect(s.isEmprendedor()).toBe(false)
  })

  it('un CAJERO ya no ve modo Sistema ni sidebar de dueño: solo Caja', () => {
    const rolUi = rolUiDesdeRespuesta('EMPRENDEDOR', 'CAJERO')!
    const ids = getAvailableModes(rolUi, ['pos.usar']).map(m => m.id)
    expect(ids).toEqual(['pos'])
    const t = ((k: string) => k) as never
    const links = buildSidebarLinks(t, rolUi, ['pos.usar'])
    const rutas = links.flatMap(l => ('to' in l && typeof l.to === 'string' ? [l.to] : []))
    expect(rutas.length).toBeGreaterThan(0)
    expect(rutas.every(r => r.startsWith('/caja'))).toBe(true)
    // el dueño sí conserva su menú de Sistema (con ruta fuera de /caja)
    const dueno = buildSidebarLinks(t, 'EMPRENDEDOR', GLOBALES)
    expect(dueno.some(l => 'to' in l && typeof l.to === 'string' && !l.to.startsWith('/caja'))).toBe(true)
  })

  it('PROPIETARIO/EDITOR conservan rol y permisos (el dueño no pierde opciones)', () => {
    useAuthStore.getState().login(resp({ rolEquipo: 'PROPIETARIO', permisosEquipo: GLOBALES }))
    const s = useAuthStore.getState()
    expect(s.userRole).toBe('EMPRENDEDOR')
    expect(s.permissions).toEqual(GLOBALES)
    expect(s.isEmprendedor()).toBe(true)
    expect(getAvailableModes('EMPRENDEDOR', GLOBALES).map(m => m.id)).toContain('admin')
  })

  it('respuesta sin rolEquipo (cliente viejo / dueño antiguo): comportamiento previo', () => {
    useAuthStore.getState().login(resp({}))
    expect(useAuthStore.getState().userRole).toBe('EMPRENDEDOR')
    expect(useAuthStore.getState().rolEquipo).toBeNull()
  })

  it('ADMIN de plataforma nunca se degrada a CAJERO', () => {
    expect(rolUiDesdeRespuesta('ADMIN', 'CAJERO')).toBe('ADMIN')
  })
})
