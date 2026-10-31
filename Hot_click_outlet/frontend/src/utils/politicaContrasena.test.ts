import { describe, expect, it } from 'vitest'
import { cumplePoliticaContrasena, mensajeFaltaContrasena } from './politicaContrasena'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'

describe('cumplePoliticaContrasena', () => {
  it('rechaza corta, sin mayúscula o sin número', () => {
    expect(cumplePoliticaContrasena('Abcdef1')).toBe(false)
    expect(cumplePoliticaContrasena('abcdefg1')).toBe(false)
    expect(cumplePoliticaContrasena('Abcdefgh')).toBe(false)
    expect(cumplePoliticaContrasena('')).toBe(false)
  })
  it('acepta 8 con mayúscula y número', () => {
    expect(cumplePoliticaContrasena('Abcdefg1')).toBe(true)
  })
})

type Dic = { register: Record<string, string> }
const tDe = (d: Dic) => (k: string, o?: Record<string, string>) =>
  d.register[k.replace('register.', '')].replace('{{lista}}', o?.lista ?? '')

describe('mensajeFaltaContrasena (registro comprador)', () => {
  const t = tDe(es as unknown as Dic)
  it('dice exactamente qué falta, en voseo', () => {
    expect(mensajeFaltaContrasena('Abcdef1', t)).toBe('Te falta llegar a 8 caracteres')
    expect(mensajeFaltaContrasena('abcdefg1', t)).toBe('Te falta una mayúscula')
    expect(mensajeFaltaContrasena('Abcdefgh', t)).toBe('Te falta un número')
    expect(mensajeFaltaContrasena('abcdefgh', t)).toBe('Te falta una mayúscula y un número')
    expect(mensajeFaltaContrasena('', t)).toBe('Te falta llegar a 8 caracteres, una mayúscula y un número')
    expect(mensajeFaltaContrasena('Abcdefg1', t)).toBeNull()
  })
  it('tiene traducción en en y pt', () => {
    expect(mensajeFaltaContrasena('abcdefg1', tDe(en as unknown as Dic))).toBe('Your password is missing an uppercase letter')
    expect(mensajeFaltaContrasena('Abcdefgh', tDe(pt as unknown as Dic))).toBe('Falta um número na sua senha')
  })
})
