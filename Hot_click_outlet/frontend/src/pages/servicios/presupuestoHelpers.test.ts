import { describe, expect, it } from 'vitest'
import i18next from 'i18next'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import { RANGOS_PRESUPUESTO } from '@/config/rangosPresupuesto'
import { etiquetasRangosPresupuesto } from './presupuestoHelpers'

describe('rangos de presupuesto (D12)', () => {
  it('arma las etiquetas desde la config, con el primero «Hasta» y el último «Más de»', async () => {
    const i18n = i18next.createInstance()
    await i18n.init({ resources: { es: { translation: es }, en: { translation: en } }, lng: 'es', interpolation: { escapeValue: false } })
    const textos = etiquetasRangosPresupuesto(RANGOS_PRESUPUESTO, i18n.t.bind(i18n)).map((r) => r.texto)
    expect(textos).toHaveLength(RANGOS_PRESUPUESTO.length)
    expect(textos[0]).toBe('Hasta ₡10.000')
    expect(textos[1]).toBe('₡10.000 – ₡25.000')
    expect(textos.at(-1)).toBe('Más de ₡100.000')
    await i18n.changeLanguage('en')
    expect(etiquetasRangosPresupuesto(RANGOS_PRESUPUESTO, i18n.t.bind(i18n))[0].texto).toBe('Up to ₡10.000')
  })

  it('los rangos son contiguos y crecientes', () => {
    for (let i = 1; i < RANGOS_PRESUPUESTO.length; i++) {
      expect(RANGOS_PRESUPUESTO[i].desde).toBe(RANGOS_PRESUPUESTO[i - 1].hasta)
    }
    expect(RANGOS_PRESUPUESTO.at(-1)?.hasta).toBeNull()
  })
})
