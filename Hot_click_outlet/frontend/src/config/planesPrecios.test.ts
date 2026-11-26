import { describe, expect, it } from 'vitest'
import {
  monedaDePlanes,
  textoComision,
  textoMensualidad,
  textoMensualidadEmprendedor,
  textoMonedaPlanes,
  textoPlan,
} from './planesPrecios'

describe('planesPrecios', () => {
  it('sin monto del backend no inventa precio ni promete gratis', () => {
    expect(textoPlan('PYME')).toBe('Mensualidad del plan + 7,5% por venta')
    expect(textoPlan('EMPRENDEDOR')).toBe('Mensualidad del plan + 9% por venta')
    expect(textoMensualidad(0)).toBe('Mensualidad del plan')
    expect(textoPlan('PYME', null, true)).toBe('Mensualidad del plan + 7,5% por venta')
    expect(textoMensualidad(null, false, 'USD')).toBe('Mensualidad en dólares')
    expect(textoMensualidad(null, false, 'CRC')).toBe('Mensualidad en colones')
  })
  it('USD: usa el monto y la moneda que manda el backend', () => {
    expect(textoPlan('EMPRENDEDOR', 9, false, 'USD')).toBe('US$9/mes + 9% por venta')
    expect(textoPlan('NEGOCIO_PLUS', 49, false, 'usd')).toBe('US$49/mes + 6% por venta')
  })
  it('CRC: muestra colones con miles', () => {
    expect(textoMensualidad(12900, false, 'CRC')).toBe('₡12.900/mes')
    expect(textoPlan('PYME', 12900, false, 'crc')).toBe('₡12.900/mes + 7,5% por venta')
    expect(textoMensualidad(12900, false, 'CRC')).not.toContain('US$')
  })
  it('moneda desconocida o ausente: texto neutro, nunca un monto inventado', () => {
    expect(textoMensualidad(24)).toBe('Mensualidad del plan')
    expect(textoMensualidad(24, false, 'EUR')).toBe('Mensualidad del plan')
    expect(textoMensualidad(24, false, null)).toBe('Mensualidad del plan')
  })
  it('«Sin mensualidad» solo con cupo gratis', () => {
    expect(textoPlan('EMPRENDEDOR', 9, true, 'USD')).toBe('Sin mensualidad + 9% por venta')
    expect(textoComision(7.5, 0)).toBe('7,5% por venta')
  })
  it('Emprendedor: gratis solo con cupo; sin cupo, monto y moneda desde backend', () => {
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 3, mensualidadUsdSinCupo: 9, moneda: 'USD' })).toBe('Sin mensualidad')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: 9, moneda: 'USD' })).toBe('US$9/mes')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: 5900, moneda: 'CRC' })).toBe('₡5.900/mes')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: null, moneda: 'CRC' })).toBe('Mensualidad en colones')
    expect(textoMensualidadEmprendedor(null)).toBe('Mensualidad del plan')
  })
  it('frase de moneda según el backend', () => {
    expect(textoMonedaPlanes('CRC')).toContain('mensualidad del plan se cobra en colones (CRC)')
    expect(textoMonedaPlanes('USD')).toContain('mensualidad del plan se cobra en dólares (USD)')
    expect(textoMonedaPlanes(null)).not.toMatch(/dólares|colones \(CRC\)/)
    expect(textoMonedaPlanes('CRC')).toContain('productos se venden en colones')
  })
  it('monedaDePlanes toma el código del primer plan que lo trae', () => {
    expect(monedaDePlanes([{ nombre: 'PYME' }, { nombre: 'X', moneda: ' crc ' }])).toBe('CRC')
    expect(monedaDePlanes(null)).toBeNull()
    expect(monedaDePlanes([{ moneda: '' }])).toBeNull()
  })
})

describe('BAJO área 9: mensualidadesUsd para /vender', () => {
  it('toma precioUsd del backend y descarta montos vacíos o desconocidos', async () => {
    const { mensualidadesUsd, textoPlan } = await import('./planesPrecios')
    const m = mensualidadesUsd([
      { nombre: 'EMPRENDEDOR', precioUsd: 9 },
      { nombre: 'PYME', precioUsd: 24 },
      { nombre: 'NEGOCIO_PLUS', precioUsd: null },
      { nombre: 'OTRO', precioUsd: 5 },
    ])
    expect(m).toEqual({ EMPRENDEDOR: 9, PYME: 24 })
    expect(textoPlan('PYME', m.PYME, false, 'USD')).toContain('/mes')
    expect(textoPlan('NEGOCIO_PLUS', m.NEGOCIO_PLUS, false, 'USD')).toContain('Mensualidad en dólares')
    expect(mensualidadesUsd(null)).toEqual({})
  })
})

describe('Primer mes gratis (diasPrueba del backend)', () => {
  it('30 o 31 días: «Primer mes gratis»; otro número: «Primeros N días gratis»', async () => {
    const { textoPrimerMesGratis } = await import('./planesPrecios')
    expect(textoPrimerMesGratis(30)).toBe('Primer mes gratis')
    expect(textoPrimerMesGratis(31)).toBe('Primer mes gratis')
    expect(textoPrimerMesGratis(14)).toBe('Primeros 14 días gratis')
    expect(textoPrimerMesGratis(1)).toBe('Primer día gratis')
  })

  it('0, ausente o inválido: sin oferta (nunca se promete gratis)', async () => {
    const { textoPrimerMesGratis, textoPrimerMesLuego } = await import('./planesPrecios')
    for (const malo of [0, -5, null, undefined, '', 'abc', 2.5]) {
      expect(textoPrimerMesGratis(malo)).toBeNull()
      expect(textoPrimerMesLuego(malo, 12900, 'CRC')).toBeNull()
    }
  })

  it('«luego {monto}/mes» con la moneda del backend: CRC, USD o sin dato', async () => {
    const { textoPrimerMesLuego } = await import('./planesPrecios')
    expect(textoPrimerMesLuego(30, 12900, 'CRC')).toBe('Primer mes gratis, luego ₡12.900/mes')
    expect(textoPrimerMesLuego(30, 24, 'USD')).toBe('Primer mes gratis, luego US$24/mes')
    expect(textoPrimerMesLuego(14, 24, 'USD')).toBe('Primeros 14 días gratis, luego US$24/mes')
    expect(textoPrimerMesLuego(30, null, null)).toBe('Primer mes gratis, luego mensualidad del plan')
    expect(textoPrimerMesLuego(30, 12900, 'EUR')).not.toMatch(/12\.900|₡|US\$/)
  })

  it('Emprendedor nunca muestra esta oferta; diasPruebaPlanes solo toma PYME y Negocio Plus', async () => {
    const { diasPruebaPlan, diasPruebaPlanes, NOTA_UNA_VEZ_POR_NEGOCIO } = await import('./planesPrecios')
    expect(diasPruebaPlan('EMPRENDEDOR', 30)).toBe(0)
    expect(diasPruebaPlan('PYME', 30)).toBe(30)
    expect(diasPruebaPlan('PYME', undefined)).toBe(0)
    expect(diasPruebaPlanes([
      { nombre: 'EMPRENDEDOR', diasPrueba: 30 },
      { nombre: 'PYME', diasPrueba: 30 },
      { nombre: 'NEGOCIO_PLUS', diasPrueba: 14 },
      { nombre: 'OTRO', diasPrueba: 30 },
    ])).toEqual({ PYME: 30, NEGOCIO_PLUS: 14 })
    expect(diasPruebaPlanes(null)).toEqual({})
    expect(NOTA_UNA_VEZ_POR_NEGOCIO).toBe('Una vez por negocio.')
  })
})

describe('Primer mes gratis según sesión y elegibilidad', () => {
  it('anónimo: ve la oferta genérica de diasPrueba', async () => {
    const { diasVisiblesPrimerMes } = await import('./planesPrecios')
    expect(diasVisiblesPrimerMes(30, { logueado: false })).toBe(30)
    expect(diasVisiblesPrimerMes(14, { logueado: false, elegible: false })).toBe(14)
    expect(diasVisiblesPrimerMes(0, { logueado: false })).toBe(0)
  })
  it('con sesión y elegible (primerMesGratisDisponible true): ve la oferta', async () => {
    const { diasVisiblesPrimerMes } = await import('./planesPrecios')
    expect(diasVisiblesPrimerMes(30, { logueado: true, elegible: true })).toBe(30)
    expect(diasVisiblesPrimerMes(0, { logueado: true, elegible: true })).toBe(0)
  })
  it('con sesión y no elegible, false o ausente: solo precio normal', async () => {
    const { diasVisiblesPrimerMes } = await import('./planesPrecios')
    expect(diasVisiblesPrimerMes(30, { logueado: true, elegible: false })).toBe(0)
    expect(diasVisiblesPrimerMes(30, { logueado: true })).toBe(0)
    expect(diasVisiblesPrimerMes(30, { logueado: true, elegible: null })).toBe(0)
  })
})
