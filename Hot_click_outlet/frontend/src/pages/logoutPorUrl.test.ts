import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { cerrarSesionPorUrl, DESTINO_TRAS_LOGOUT } from './logoutPorUrl'

const acciones = (haySesion: boolean) => ({
  haySesion,
  revocar: vi.fn(() => Promise.resolve()),
  cerrarLocal: vi.fn(),
  avisar: vi.fn(),
  navegar: vi.fn(),
})

describe('/logout por URL (regresión: daba 404)', () => {
  it('con sesión: revoca en el servidor, limpia la sesión local, avisa y redirige', () => {
    const a = acciones(true)
    cerrarSesionPorUrl(a)
    expect(a.revocar).toHaveBeenCalledOnce()
    expect(a.cerrarLocal).toHaveBeenCalledOnce()
    expect(a.avisar).toHaveBeenCalledOnce()
    expect(a.navegar).toHaveBeenCalledWith(DESTINO_TRAS_LOGOUT)
  })

  it('si el servidor falla, la sesión local se cierra igual', () => {
    const a = { ...acciones(true), revocar: vi.fn(() => Promise.reject(new Error('red'))) }
    cerrarSesionPorUrl(a)
    expect(a.cerrarLocal).toHaveBeenCalledOnce()
    expect(a.navegar).toHaveBeenCalledWith('/')
  })

  it('sin sesión solo redirige', () => {
    const a = acciones(false)
    cerrarSesionPorUrl(a)
    expect(a.revocar).not.toHaveBeenCalled()
    expect(a.cerrarLocal).not.toHaveBeenCalled()
    expect(a.navegar).toHaveBeenCalledWith('/')
  })

  it('la ruta /logout existe fuera de ProtectedRoute y usa LogoutPage; mismo destino que /perfil', () => {
    const rutas = readFileSync(resolve(__dirname, '../app/AppRoutes.tsx'), 'utf8')
    expect(rutas).toContain('<Route path="/logout" element={<LogoutPage />} />')
    const perfil = readFileSync(resolve(__dirname, 'ProfilePage.tsx'), 'utf8')
    expect(perfil).toMatch(/navigate\('\/', \{ replace: true \}\)/)
    expect(perfil).toContain("t('profile.loggedOut')")
  })
})
