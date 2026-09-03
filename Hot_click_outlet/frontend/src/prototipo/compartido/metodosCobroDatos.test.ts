import { describe, expect, it } from 'vitest'
import {
  METODOS_COBRO,
  mascaraDesdeDato,
  validarDatoMetodo,
} from './metodosCobroDatos'

describe('METODOS_COBRO', () => {
  it('incluye SINPE, IBAN y tarjeta para recibir ingresos', () => {
    expect(METODOS_COBRO.map((m) => m.tipo)).toEqual(['sinpe', 'iban', 'tarjeta'])
  })
})

describe('validarDatoMetodo', () => {
  it('exige 8 dígitos en SINPE', () => {
    expect(validarDatoMetodo('sinpe', '8888')).toMatch(/8 dígitos/)
    expect(validarDatoMetodo('sinpe', '88880000')).toBeNull()
  })
})

describe('mascaraDesdeDato', () => {
  it('enmascara SINPE e IBAN', () => {
    expect(mascaraDesdeDato('sinpe', '88880000')).toBe('8888-0000')
    expect(mascaraDesdeDato('iban', 'CR21000012344521')).toContain('****')
  })
})
