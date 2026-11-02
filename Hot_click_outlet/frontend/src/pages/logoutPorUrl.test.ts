import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import { cerrarSesionPorUrl, DESTINO_TRAS_LOGOUT } from './logoutPorUrl'

describe('/logout por URL (regresión: daba 404)', () => {
  afterEach(() => { delete api.defaults.adapter })

  it('con sesión: limpia la sesión local, avisa y redirige a /', async () => {
    api.defaults.adapter = async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    const a = { token: 'tok', cerrarLocal: vi.fn(), avisar: vi.fn(), navegar: vi.fn() }
    await cerrarSesionPorUrl(a)
    expect(a.cerrarLocal).toHaveBeenCalledOnce()
    expect(a.avisar).toHaveBeenCalledOnce()
    expect(a.navegar).toHaveBeenCalledWith(DESTINO_TRAS_LOGOUT)
  })

  it('sin sesión solo redirige y no llama al servidor', async () => {
    const adaptador = vi.fn()
    api.defaults.adapter = adaptador
    const a = { token: null, cerrarLocal: vi.fn(), avisar: vi.fn(), navegar: vi.fn() }
    await cerrarSesionPorUrl(a)
    expect(adaptador).not.toHaveBeenCalled()
    expect(a.cerrarLocal).not.toHaveBeenCalled()
    expect(a.navegar).toHaveBeenCalledWith('/')
  })

  it('la ruta /logout existe fuera de ProtectedRoute y usa LogoutPage; mismo destino que /perfil', () => {
    const rutas = readFileSync(resolve(__dirname, '../app/AppRoutes.tsx'), 'utf8')
    expect(rutas).toContain('<Route path="/logout" element={<LogoutPage />} />')
    const perfil = readFileSync(resolve(__dirname, 'ProfilePage.tsx'), 'utf8')
    expect(perfil).toMatch(/navegar: \(d\) => navigate\(d, \{ replace: true \}\),\s*destino: '\/'/)
    expect(perfil).toContain("t('profile.loggedOut')")
  })
})
