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
