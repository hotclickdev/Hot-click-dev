import { describe, expect, it } from 'vitest'
import es from './es.json'
import en from './en.json'
import pt from './pt.json'

const CLAVES_AYUDA = [
  'title', 'subtitle', 'serviciosTitle', 'serviciosDetalle', 'garantiaTitle', 'garantiaDetalle',
  'enviosTitle', 'enviosDetalle', 'faqTitle', 'faqDetalle', 'contactoTitle', 'contactoDetalle',
] as const
const CLAVES_MULTIVENDEDOR = ['multivendorPackage', 'multivendorPackageHint'] as const

describe.each([['es', es], ['en', en], ['pt', pt]] as const)('locale %s', (_, locale) => {
  it('tiene todos los textos del centro de ayuda', () => {
    for (const clave of CLAVES_AYUDA) expect(locale.ayudaPage[clave]).toBeTruthy()
  })

  it('tiene la etiqueta del paquete multivendedor del admin', () => {
    for (const clave of CLAVES_MULTIVENDEDOR) expect(locale.adminOrders[clave]).toBeTruthy()
  })
})
