import { describe, expect, it } from 'vitest'
import {
  esBajada,
  excesosAlBajar,
  excesosDeRespuesta,
  nombresRecursos,
  recursosQueEntran,
  textoFaltante,
  type UsoTenant,
} from './bajarPlanHelpers'

const SIN_USO: UsoTenant = { productos: 0, bodegas: 0, cajas: 0, usuarios: 0 }

describe('bajar de plan', () => {
  it('bloquea con un exceso por recurso y no cuenta los ilimitados', () => {
    expect(excesosAlBajar({ maxProductos: 50, maxUsuarios: 2 }, { ...SIN_USO, productos: 63, usuarios: 2 })).toEqual([
      { recurso: 'productos', uso: 63, limite: 50, exceso: 13 },
    ])
    expect(excesosAlBajar({ maxProductos: -1, maxUsuarios: null }, { ...SIN_USO, productos: 900, usuarios: 40 })).toEqual([])
  })
  it('revisa productos, bodegas, cajas y usuarios en ese orden', () => {
    const destino = { maxProductos: 50, maxBodegas: 1, maxCajas: 1, maxUsuarios: 2 }
    const excesos = excesosAlBajar(destino, { productos: 63, bodegas: 3, cajas: 2, usuarios: 5 })
    expect(excesos.map((e) => e.recurso)).toEqual(['productos', 'bodegas', 'cajas', 'usuarios'])
    expect(excesosAlBajar(destino, { productos: 50, bodegas: 1, cajas: 1, usuarios: 2 })).toEqual([])
  })
  it('lista los recursos que ya entran y arma el texto de lo que falta', () => {
    const excesos = excesosAlBajar({ maxProductos: 50, maxBodegas: 1 }, { ...SIN_USO, productos: 63, bodegas: 3 })
    expect(recursosQueEntran(excesos)).toEqual(['cajas', 'usuarios'])
    expect(textoFaltante(excesos)).toBe('13 productos y 2 bodegas')
    expect(textoFaltante(excesosAlBajar({ maxUsuarios: 1 }, { ...SIN_USO, usuarios: 2 }))).toBe('1 usuario')
  })
  it('nombra los recursos que ya entran', () => {
    expect(nombresRecursos(['bodegas', 'usuarios'])).toBe('Bodegas y usuarios')
    expect(nombresRecursos(['bodegas', 'cajas', 'usuarios'])).toBe('Bodegas, cajas y usuarios')
    expect(nombresRecursos(['usuarios'])).toBe('Usuarios')
  })
  it('lee el detalle que manda el backend y descarta lo inválido', () => {
    const data = { excesos: [{ recurso: 'productos', uso: 63, limite: 50, exceso: 13 }, { recurso: 'otro', uso: 1 }] }
    expect(excesosDeRespuesta(data)).toEqual([{ recurso: 'productos', uso: 63, limite: 50, exceso: 13 }])
    expect(excesosDeRespuesta({ error: 'x' })).toEqual([])
    expect(excesosDeRespuesta(null)).toEqual([])
  })
  it('solo las bajadas se revisan', () => {
    expect(esBajada('NEGOCIO_PLUS', 'PYME')).toBe(true)
    expect(esBajada('PYME', 'EMPRENDEDOR')).toBe(true)
    expect(esBajada('EMPRENDEDOR', 'PYME')).toBe(false)
    expect(esBajada('PYME', 'PYME')).toBe(false)
    expect(esBajada(null, 'EMPRENDEDOR')).toBe(false)
  })
})
