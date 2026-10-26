import { describe, expect, it } from 'vitest'
import { archivosFuente, leer } from './helpers'

const TUTEO_USTED = /\b(Usted|usted|Tienes|Necesitas|Selecciona categoría|Selecciona bodega|Elige un plan|Ingresa un monto)\b|Intenta de nuevo\b|Espera a que/

describe('C7: voseo en textos de pantalla', () => {
  it('es.json sin usted/tuteo de la lista', () => {
    const malas = Object.entries(leer('i18n/locales/es.json').split('\n')).filter(([, l]) => TUTEO_USTED.test(l))
    expect(malas).toEqual([])
  })
  it('componentes .tsx sin usted/tuteo de la lista (salvo Tilopay y checkout de Dev Pagos, fuera de alcance)', () => {
    const malos = archivosFuente()
      .filter((f) => f.endsWith('.tsx') && !/tilopay|TiendaCheckoutPage/i.test(f))
      .filter((f) => leer(f).split('\n').some((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && TUTEO_USTED.test(l)))
    expect(malos).toEqual([])
  })
})
