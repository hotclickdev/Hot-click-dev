import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarExtrasLocal, leerExtrasLocal, limpiarExtrasLocal } from './negocioExtras'

const CLAVE = 'hc-emp-negocio-extras-v1'
const cache = new Map<string, string>()

function instalarCacheLocal() {
  cache.clear()
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => cache.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      cache.set(clave, valor)
    },
    removeItem: (clave: string) => {
      cache.delete(clave)
    },
    clear: () => cache.clear(),
  })
}

beforeEach(instalarCacheLocal)

describe('negocioExtras localStorage', () => {
  it('leerExtrasLocal devuelve vacío si no hay cache', () => {
    expect(leerExtrasLocal()).toEqual({ categoria: '', instagram: '', zona: '' })
  })

  it('guardar y leer redondean categoria, instagram y zona', () => {
    guardarExtrasLocal({ categoria: 'Ropa', instagram: '@local', zona: 'GAM' })
    expect(leerExtrasLocal()).toEqual({
      categoria: 'Ropa',
      instagram: '@local',
      zona: 'GAM',
    })
  })

  it('limpiarExtrasLocal borra el cache tras un PUT exitoso', () => {
    guardarExtrasLocal({ categoria: 'Ropa', instagram: '@local', zona: 'GAM' })
    limpiarExtrasLocal()
    expect(localStorage.getItem(CLAVE)).toBeNull()
    expect(leerExtrasLocal()).toEqual({ categoria: '', instagram: '', zona: '' })
  })

  it('leerExtrasLocal aguanta JSON inválido', () => {
    localStorage.setItem(CLAVE, '{no-json')
    expect(leerExtrasLocal()).toEqual({ categoria: '', instagram: '', zona: '' })
  })
})
