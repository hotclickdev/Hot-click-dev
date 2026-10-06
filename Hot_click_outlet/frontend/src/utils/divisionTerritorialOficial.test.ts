import { describe, expect, it } from 'vitest'
import { cantonesDeCatalogo, distritosDeCatalogo, presentarCatalogo } from './divisionTerritorialOficial'

describe('presentarCatalogo', () => {
  it('recupera la tilde de los cantones que ya usamos y deja el distrito del IGN', () => {
    const catalogo = presentarCatalogo([{
      nombre: 'San Jose',
      cantones: [{ nombre: 'Escazu', distritos: ['San Rafael'] }, { nombre: 'Perez Zeledon', distritos: ['San Isidro de El General'] }],
    }])
    expect(catalogo[0].nombre).toBe('San José')
    expect(cantonesDeCatalogo(catalogo, 'San José')).toEqual(['Escazú', 'Pérez Zeledón'])
    expect(distritosDeCatalogo(catalogo, 'San José', 'Escazú')).toEqual(['San Rafael'])
  })
})
