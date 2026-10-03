import { describe, expect, it } from 'vitest'
import i18next from 'i18next'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'
import { readFileSync } from 'node:fs'
import { TEXTO_TIEMPO_ENVIO, TIEMPOS_ENVIO, TIEMPOS_ENVIO_PROVISIONALES, variablesTiemposEnvio } from './tiemposEnvio'
import { TARIFAS } from '@/pages/envios/enviosData'
import { opcionesEnvio } from '@/pages/checkout/checkoutHelpers'

describe('tiempos de envío: una sola fuente (D13)', () => {
  it('los valores salen del JSON que también lee el backend (correo de guía)', () => {
    const json = JSON.parse(readFileSync(new URL('../../../src/main/resources/config/tiempos-envio.json', import.meta.url), 'utf8'))
    expect(TIEMPOS_ENVIO).toEqual({ rapido: json.rapido, normalGam: json.normalGam, fueraGam: json.fueraGam })
    expect(TIEMPOS_ENVIO_PROVISIONALES).toBe(json.provisional)
  })

  it('/envios y el checkout muestran el mismo texto que la config', () => {
    const tarifa = (id: string) => TARIFAS.find((f) => f.id === id)?.tiempo
    expect(tarifa('rapido')).toBe(TEXTO_TIEMPO_ENVIO.rapido)
    expect(tarifa('normal-gam')).toBe(TEXTO_TIEMPO_ENVIO.normalGam)
    expect(tarifa('fuera-gam')).toBe(TEXTO_TIEMPO_ENVIO.fueraGam)
    const sub = (valor: string) => opcionesEnvio(null).find((o) => o.value === valor)?.sub ?? ''
    expect(sub('ENVIO_RAPIDO').startsWith(TEXTO_TIEMPO_ENVIO.rapido)).toBe(true)
    expect(sub('ENVIO_NORMAL_GAM').startsWith(TEXTO_TIEMPO_ENVIO.normalGam)).toBe(true)
    expect(sub('ENVIO_NORMAL_FUERA_GAM').startsWith(TEXTO_TIEMPO_ENVIO.fueraGam)).toBe(true)
  })

  it('los textos i18n interpolan la config en es, en y pt', async () => {
    const i18n = i18next.createInstance()
    await i18n.init({
      resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } },
      lng: 'es',
      interpolation: { escapeValue: false, defaultVariables: variablesTiemposEnvio() },
    })
    expect(i18n.t('home.shipping.rapidoTime')).toBe('30 min – 2 horas')
    expect(i18n.t('checkout.f.envioNormalSub')).toBe('2 a 4 días hábiles')
    expect(i18n.t('home.shipping.normalTime', { lng: 'en' })).toBe('2–4 business days')
    expect(i18n.t('home.shipping.fueraTime', { lng: 'pt' })).toBe('3–4 dias úteis')
    for (const lng of ['es', 'en', 'pt']) {
      const json = JSON.stringify({ es, en, pt }[lng])
      expect(json).not.toMatch(/30 min [–a]|2–4 |2 a 4 d|2 to 4 b/)
    }
  })
})
