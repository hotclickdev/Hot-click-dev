import { describe, expect, it } from 'vitest'
import { bodegasMarcables, direccionDeBodega } from './marcaBodega'

describe('bodegasMarcables', () => {
  it('deja solo bodegas con id y conserva el pin', () => {
    const lista = bodegasMarcables([
      { id: 4, nombreBodega: 'Central', direccionExacta: 'Escazú', telefono: '88881111', latitud: 9.92, longitud: -84.09 },
      { nombreBodega: 'Sin id' },
    ])
    expect(lista).toEqual([{
      id: '4',
      nombre: 'Central',
      direccion: 'Escazú',
      telefono: '88881111',
      encargado: '',
      latitud: 9.92,
      longitud: -84.09,
    }])
    expect(direccionDeBodega(lista[0])).toBe('Central — Escazú')
  })
})
