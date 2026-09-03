import { describe, expect, it } from 'vitest'
import {
  METODOS_COBRO,
  METODOS_COBRO_DEMO,
  decidirFuenteMetodosCobro,
  mascaraDesdeDato,
  validarDatoMetodo,
} from './metodosCobroDatos'

describe('METODOS_COBRO', () => {
  it('incluye SINPE, IBAN y tarjeta para recibir ingresos', () => {
    expect(METODOS_COBRO.map((m) => m.tipo)).toEqual(['sinpe', 'iban', 'tarjeta'])
  })
})

describe('decidirFuenteMetodosCobro', () => {
  it('usa API cuando la petición ok (lista vacía = prod, no demo)', () => {
    const r = decidirFuenteMetodosCobro({ ok: true, data: [] })
    expect(r.fuente).toBe('api')
    expect(r.metodos).toEqual([])
  })

  it('mapea métodos válidos de la API y descarta basura', () => {
    const r = decidirFuenteMetodosCobro({
      ok: true,
      data: [
        {
          id: 7,
          tipo: 'sinpe',
          nombre: 'SINPE Móvil',
          mascara: '8888-0000',
          nota: 'ok',
          predeterminado: true,
        },
        { id: 'malo' },
      ],
    })
    expect(r.fuente).toBe('api')
    expect(r.metodos).toHaveLength(1)
    expect(r.metodos[0]).toMatchObject({ id: '7', tipo: 'sinpe', predeterminado: true })
  })

  it('respuesta ok no-array → API vacío (no cae a demo)', () => {
    const r = decidirFuenteMetodosCobro({ ok: true, data: { error: 'x' } })
    expect(r.fuente).toBe('api')
    expect(r.metodos).toEqual([])
  })

  it('petición fallida → demo con flag explícito', () => {
    const r = decidirFuenteMetodosCobro({ ok: false })
    expect(r.fuente).toBe('demo')
    expect(r.metodos.map((m) => m.tipo)).toEqual(
      METODOS_COBRO_DEMO.map((m) => m.tipo),
    )
    expect(r.metodos.every((m) => m.id.startsWith('demo-'))).toBe(true)
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
