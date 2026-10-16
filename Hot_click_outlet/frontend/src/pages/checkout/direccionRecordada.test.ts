import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarDireccionRecordada, leerDireccionRecordada } from './direccionRecordada'

function storageEnMemoria(): Storage {
  const datos = new Map<string, string>()
  return {
    get length() { return datos.size },
    clear: () => datos.clear(),
    getItem: (k) => datos.get(k) ?? null,
    key: (i) => [...datos.keys()][i] ?? null,
    removeItem: (k) => { datos.delete(k) },
    setItem: (k, v) => { datos.set(k, String(v)) },
  }
}

describe('S1-17 dirección recordada del comprador con sesión', () => {
  beforeEach(() => { vi.stubGlobal('window', { localStorage: storageEnMemoria() }) })
  afterEach(() => { vi.unstubAllGlobals() })

  const dir = { provincia: 'Heredia', canton: 'Barva', distrito: 'San Pedro', direccion: '100 m norte de la iglesia' }

  it('guarda y devuelve la última dirección por usuario', () => {
    guardarDireccionRecordada(7, dir)
    expect(leerDireccionRecordada(7)).toEqual(dir)
    expect(leerDireccionRecordada(8)).toBeNull()
  })

  it('el invitado (sin id) no guarda ni lee nada', () => {
    guardarDireccionRecordada(null, dir)
    expect(leerDireccionRecordada(null)).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('ignora datos corruptos o sin provincia', () => {
    window.localStorage.setItem('hotclick-ultima-direccion:7', '{no es json')
    expect(leerDireccionRecordada(7)).toBeNull()
    guardarDireccionRecordada(7, { ...dir, provincia: '' })
    expect(leerDireccionRecordada(7)).toBeNull()
  })
})
