import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import api from '@/services/api'
import { cerrarSesionCompleta } from '@/services/cerrarSesion'
import { cerrarSesionPorUrl } from '@/pages/logoutPorUrl'

/**
 * Regresión (seguridad, MEDIO): el POST /auth/logout salía sin Bearer porque la sesión local se limpiaba antes
 * de que el interceptor asíncrono leyera el token. Aquí el storage está vacío (como tras cerrarLocal) y el
 * POST debe llevar Authorization igual, y cerrarLocal debe correr DESPUÉS de la respuesta.
 */
const ACCESO_PRUEBA = 'acceso-prueba'

function capturar() {
  const orden: string[] = []
  const pedidos: InternalAxiosRequestConfig[] = []
  const adaptador: AxiosAdapter = async (config) => {
    pedidos.push(config)
    await new Promise((r) => setTimeout(r, 5))
    orden.push('respuesta')
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }
  api.defaults.adapter = adaptador
  return { orden, pedidos }
}

function autorizacion(c: InternalAxiosRequestConfig | undefined): unknown {
  return c?.headers?.Authorization ?? (c?.headers as { get?: (k: string) => unknown } | undefined)?.get?.('Authorization')
}

describe('cerrar sesión: el POST /auth/logout lleva Authorization en los tres caminos', () => {
  afterEach(() => { delete api.defaults.adapter; vi.restoreAllMocks() })

  it('/logout por URL', async () => {
    const { orden, pedidos } = capturar()
    await cerrarSesionPorUrl({ token: ACCESO_PRUEBA, cerrarLocal: () => orden.push('local'), avisar: () => {}, navegar: () => {} })
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].url).toBe('/auth/logout')
    expect(autorizacion(pedidos[0])).toBe(`Bearer ${ACCESO_PRUEBA}`)
    expect(orden).toEqual(['respuesta', 'local'])
  })

  it('useCerrarSesion (paneles) y botón de /perfil usan el mismo cierre con Bearer', async () => {
    for (const destino of ['/', '/login']) {
      const { orden, pedidos } = capturar()
      const navegar = vi.fn()
      await cerrarSesionCompleta({ token: ACCESO_PRUEBA, cerrarLocal: () => orden.push('local'), navegar, destino })
      expect(autorizacion(pedidos[0])).toBe(`Bearer ${ACCESO_PRUEBA}`)
      expect(orden).toEqual(['respuesta', 'local'])
      expect(navegar).toHaveBeenCalledWith(destino)
    }
  })

  it('si el servidor falla, la sesión local se cierra igual', async () => {
    api.defaults.adapter = () => Promise.reject(new Error('red'))
    const cerrarLocal = vi.fn()
    await cerrarSesionCompleta({ token: ACCESO_PRUEBA, cerrarLocal, navegar: () => {} })
    expect(cerrarLocal).toHaveBeenCalledOnce()
  })

  it.each([
    ['hooks/useCerrarSesion.ts'],
    ['pages/ProfilePage.tsx'],
    ['pages/LogoutPage.tsx'],
  ])('%s captura el token y usa el cierre compartido (sin authService.logout() suelto)', (ruta) => {
    const src = readFileSync(resolve(__dirname, '..', ruta), 'utf8')
    expect(src).toContain('token: useAuthStore.getState().token')
    expect(src).not.toMatch(/authService\.logout\(\)/)
  })
})
