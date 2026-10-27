import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import { periodoGratis } from './periodoGratis'

const t = (key: string) => (key === 'emprende.periodoFallback' ? es.emprende.periodoFallback : key)

describe('periodoGratis', () => {
  it('usa el período que manda el backend (derivado de TRIAL_EMPRENDEDOR_DIAS), sin fijar «3 meses»', () => {
    expect(periodoGratis({ periodoGratis: '3 meses' }, t)).toBe('3 meses')
    expect(periodoGratis({ periodoGratis: '45 días' }, t)).toBe('45 días')
  })

  it('sin dato del backend usa una frase genérica, no un número inventado', () => {
    expect(periodoGratis(null, t)).toBe('unos meses')
    expect(periodoGratis({ periodoGratis: ' ' }, t)).toBe('unos meses')
  })

  it('los textos de cupo dicen «meses gratis» con voseo y ya no «cupos gratis»', () => {
    expect(es.emprende.cupoTitle).toContain('{{periodo}} gratis')
    expect(es.emprende.cupoHint).toContain('pagás')
    expect(`${es.emprende.cupoTitle}${es.emprende.cupoHint}${es.emprende.cupoLlenoTitle}${es.emprende.membresiaHint}`)
      .not.toContain('cupos gratis')
  })
})
