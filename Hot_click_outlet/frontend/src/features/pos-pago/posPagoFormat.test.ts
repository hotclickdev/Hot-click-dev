import { describe, expect, it } from 'vitest'
import { formatColones, inicialesProducto, nombreItem, tituloYCodigo } from './posPagoFormat'

describe('inicialesProducto', () => {
  it('toma hasta dos iniciales', () => {
    expect(inicialesProducto('QA Emprendedor Test 2')).toBe('QE')
    expect(inicialesProducto('Gar')).toBe('G')
    expect(inicialesProducto('  ')).toBe('?')
  })
})

describe('nombreItem y formatColones', () => {
  it('usa nombreProducto de respaldo', () => {
    expect(nombreItem({ nombreProducto: 'Teclado' })).toBe('Teclado')
  })

  it('formatea colones enteros', () => {
    expect(formatColones(60720).replace(/\s/g, '')).toBe('60720')
  })
})

describe('tituloYCodigo', () => {
  it('separa el SKU entre paréntesis', () => {
    expect(tituloYCodigo('Gar naranja hombre (GAR-8322)')).toEqual({
      titulo: 'Gar naranja hombre',
      codigo: 'GAR-8322',
    })
  })
})
