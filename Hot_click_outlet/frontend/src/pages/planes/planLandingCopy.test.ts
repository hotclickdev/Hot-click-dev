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

  it('PYME y Negocio Plus no cambian con el cupo', () => {
    expect(copyLanding('pyme', 25)).toBe(PLAN_LANDING_COPY.pyme)
    expect(copyLanding('plus', 25)).toBe(PLAN_LANDING_COPY.plus)
  })
})
