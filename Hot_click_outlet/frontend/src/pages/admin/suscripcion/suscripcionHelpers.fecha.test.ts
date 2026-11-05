import { describe, expect, it } from 'vitest'
import { fmtFechaSuscripcion } from './suscripcionHelpers'

describe('fmtFechaSuscripcion (BAJO-3: hora de Costa Rica)', () => {
  it('fecha de calendario YYYY-MM-DD no se corre un día', () => {
    expect(fmtFechaSuscripcion('2027-02-02')).toMatch(/^2 de febrero de 2027$/)
  })

  it('instante cerca de medianoche UTC se muestra en America/Costa_Rica', () => {
    expect(fmtFechaSuscripcion('2027-02-03T03:25:59Z')).toMatch(/^2 de febrero de 2027$/)
    expect(fmtFechaSuscripcion('2027-02-03T05:59:59Z')).toMatch(/^2 de febrero de 2027$/)
    expect(fmtFechaSuscripcion('2027-02-03T06:00:00Z')).toMatch(/^3 de febrero de 2027$/)
  })

  it('vacío o inválido → guion', () => {
    expect(fmtFechaSuscripcion(null)).toBe('—')
    expect(fmtFechaSuscripcion('no-fecha')).toBe('—')
  })
})
