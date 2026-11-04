import { describe, expect, it } from 'vitest'
import es from './locales/es.json'

/** BAJO área 9: /perfil mezclaba «usted» (Sus datos, Inténtelo) con el voseo del resto. */
describe('textos de /perfil en voseo', () => {
  it('no usan formas de usted', () => {
    const textos = Object.values((es as Record<string, Record<string, unknown>>).profile).filter((v) => typeof v === 'string') as string[]
    const usted = /\b(usted|Inténtelo|Intente|Ingrese|Sus datos|sin sus)\b/i
    expect(textos.filter((t) => usted.test(t))).toEqual([])
  })
})
