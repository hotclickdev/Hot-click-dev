import { describe, expect, it } from 'vitest'
import { PLAN_LANDING_COPY, copyLanding, textoPrimerosNegocios } from './planLandingCopy'

const textoEmprendedor = (c: ReturnType<typeof copyLanding>) =>
  [c.subheadline, ...c.faq.map((f) => f.respuesta)].join(' | ')

describe('planLandingCopy: el cupo de Emprendedor no va fijo', () => {
  it('textoPrimerosNegocios usa el límite del backend y cae a una frase sin cifra', () => {
    expect(textoPrimerosNegocios(25)).toBe('los primeros 25 negocios')
    for (const malo of [null, undefined, 0, -1, 1.5]) expect(textoPrimerosNegocios(malo)).toBe('los primeros negocios')
  })

  it('con límite 25 la landing dice 25 y nunca 70', () => {
    const texto = textoEmprendedor(copyLanding('emprendedor', 25))
    expect(texto).toContain('los primeros 25 negocios')
    expect(texto).not.toContain('70')
  })

  it('el respaldo (sin dato del backend) no trae ninguna cifra de cupo', () => {
    for (const copy of [PLAN_LANDING_COPY.emprendedor, copyLanding('emprendedor'), copyLanding('emprendedor', null)]) {
      const texto = textoEmprendedor(copy)
      expect(texto).toContain('los primeros negocios')
      expect(texto).not.toMatch(/70|\d+ negocios/)
    }
  })

  it('ya no promete «gratis» a secas: período sin mensualidad con cupo y precio posterior', () => {
    const copy = copyLanding('emprendedor', 25, { periodo: '3 meses', mensualUsd: 9, moneda: 'USD' })
    expect(copy.subheadline).toBe('Sin mensualidad por 3 meses para los primeros 25 negocios; después, US$9/mes + 9% por venta, sin mínimo.')
    const texto = textoEmprendedor(copy)
    expect(texto).not.toMatch(/gratis/i)
    expect(texto).toContain('US$9/mes')
    expect(texto).toMatch(/sin mensualidad por 3 meses/i)
  })

  it('CRC: muestra colones y la nota de moneda en colones', () => {
    const copy = copyLanding('emprendedor', 25, { periodo: '3 meses', mensualUsd: 5900, moneda: 'CRC' })
    expect(copy.subheadline).toBe('Sin mensualidad por 3 meses para los primeros 25 negocios; después, ₡5.900/mes + 9% por venta, sin mínimo.')
    const texto = textoEmprendedor(copy)
    expect(texto).not.toContain('US$')
    expect(texto).toContain('la mensualidad también se cobra en colones')
  })

  it('moneda desconocida: sin monto aunque venga cifra', () => {
    const texto = textoEmprendedor(copyLanding('emprendedor', 25, { periodo: '3 meses', mensualUsd: 9, moneda: 'EUR' }))
    expect(texto).not.toMatch(/US\$|₡|€|\b9\/mes/)
    expect(texto).toContain('mensualidad del plan')
  })

  it('sin datos del backend no inventa período ni monto', () => {
    const texto = textoEmprendedor(copyLanding('emprendedor'))
    expect(texto).toMatch(/sin mensualidad por un período/i)
    expect(texto).toContain('mensualidad del plan')
    expect(texto).not.toMatch(/US\$\d|gratis|\d+ (meses|días)/i)
  })

  it('el FAQ de PYME explica que el período sin mensualidad es temporal y con cupo', () => {
    const faq = PLAN_LANDING_COPY.pyme.faq[0]
    expect(faq.pregunta).not.toMatch(/gratis/i)
    expect(faq.respuesta).toMatch(/temporal/)
    expect(faq.respuesta).toMatch(/cupo limitado/)
    expect(faq.respuesta).toMatch(/mensualidad/)
  })

  it('PYME y Negocio Plus no cambian con el cupo', () => {
    expect(copyLanding('pyme', 25)).toBe(PLAN_LANDING_COPY.pyme)
    expect(copyLanding('plus', 25)).toBe(PLAN_LANDING_COPY.plus)
  })
})

describe('planLandingCopy: primer mes gratis (diasPrueba)', () => {
  it('PYME con 30 días y CRC: «Primer mes gratis, luego ₡12.900/mes» + nota una vez por negocio', () => {
    const c = copyLanding('pyme', null, { diasPrueba: 30, mensualUsd: 12900, moneda: 'CRC' })
    expect(c.prueba).toBe('Primer mes gratis, luego ₡12.900/mes')
    expect(c.notaPrueba).toBe('Una vez por negocio.')
  })

  it('Negocio Plus con 14 días y USD: «Primeros 14 días gratis, luego US$49/mes»', () => {
    expect(copyLanding('plus', null, { diasPrueba: 14, mensualUsd: 49, moneda: 'USD' }).prueba)
      .toBe('Primeros 14 días gratis, luego US$49/mes')
  })

  it('diasPrueba 0 o ausente: el copy sale igual que antes, sin promesa de gratis', () => {
    expect(copyLanding('pyme', null, { diasPrueba: 0, mensualUsd: 12900, moneda: 'CRC' })).toBe(PLAN_LANDING_COPY.pyme)
    expect(copyLanding('plus', null, { mensualUsd: 49, moneda: 'USD' })).toBe(PLAN_LANDING_COPY.plus)
    expect(copyLanding('plus')).toBe(PLAN_LANDING_COPY.plus)
  })

  it('Emprendedor ignora diasPrueba', () => {
    expect(copyLanding('emprendedor', 25, { diasPrueba: 30 }).prueba).toBeUndefined()
  })
})
