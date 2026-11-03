import { describe, expect, it } from 'vitest'
import { PLAN_PRECIOS } from './planesPrecios'
import { PLAN_EMPRENDEDOR } from '../pages/emprende/emprendePrecios'
import es from '../i18n/locales/es.json'
import en from '../i18n/locales/en.json'
import pt from '../i18n/locales/pt.json'

/** Regresión 26-oct: comisiones 9 / 7,5 / 6 % (Emprendedor < PYME < Negocio Plus), sin 9/7/7 ni 8/4/4. */
const textos = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(textos) : []

describe('comisiones por plan unificadas', () => {
  it('PLAN_PRECIOS es 9 / 7.5 / 6 y decrece con el plan', () => {
    expect(PLAN_PRECIOS).toEqual({ EMPRENDEDOR: { comisionPct: 9 }, PYME: { comisionPct: 7.5 }, NEGOCIO_PLUS: { comisionPct: 6 } })
    expect(PLAN_EMPRENDEDOR.comisionPct).toBe(PLAN_PRECIOS.EMPRENDEDOR.comisionPct)
  })

  it.each([['es', es], ['en', en], ['pt', pt]])('i18n %s solo usa 9, 7,5 y 6 % por venta', (_l, json) => {
    const validos = new Set(['9', '7,5', '7.5', '6'])
    const re = /(\d+(?:[.,]\d+)?)\s?% (?:por venta|per sale|por venda)/g
    for (const t of textos(json)) for (const m of t.matchAll(re)) expect(validos, t).toContain(m[1])
  })
})
