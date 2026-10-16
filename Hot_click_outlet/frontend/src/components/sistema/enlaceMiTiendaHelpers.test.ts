import { describe, expect, it } from 'vitest'
import { estadoEnlaceTienda } from './enlaceMiTiendaHelpers'

describe('S1-20 enlace completo de mi tienda', () => {
  it('tienda pública: URL absoluta /tienda/<slug> lista para copiar', () => {
    const e = estadoEnlaceTienda('bruma-cafe', true, 'ACTIVO')
    expect(e).toMatchObject({ tipo: 'publica', ruta: '/tienda/bruma-cafe' })
    expect(e.tipo === 'publica' && e.url.endsWith('/tienda/bruma-cafe')).toBe(true)
  })

  it('tienda pendiente: muestra la dirección y avisa que todavía no es pública', () => {
    const e = estadoEnlaceTienda('bruma-cafe', false, 'PENDIENTE_APROBACION')
    expect(e.tipo).toBe('pendiente')
    expect(e.tipo === 'pendiente' && e.aviso).toContain('Todavía no es pública')
  })

  it('sin slug no muestra nada', () => {
    expect(estadoEnlaceTienda(null, true)).toEqual({ tipo: 'ninguno' })
  })
})
