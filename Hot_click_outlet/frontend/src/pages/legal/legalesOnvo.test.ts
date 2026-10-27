import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Decisión de Andrés (26-oct): en Términos, Privacidad y Devoluciones ONVO es el único procesador de pagos. */
const PAGINAS = ['../TerminosPage.tsx', '../PrivacidadPage.tsx', '../devoluciones/devolucionesData.tsx']
const leer = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8')

/** Claves i18n legales (es/en): las secciones footer con privacidad/términos/devoluciones. */
function clavesLegales(locale: string): string[] {
  const json = JSON.parse(leer(`../../i18n/locales/${locale}.json`))
  const out: string[] = []
  const recorrer = (o: unknown, ruta: string) => {
    if (typeof o === 'string') {
      if (/terminos|privacidad|devoluciones|legal/i.test(ruta)) out.push(o)
    } else if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) recorrer(v, `${ruta}.${k}`)
    }
  }
  recorrer(json, '')
  return out
}

describe('legales: ONVO único procesador', () => {
  it.each(PAGINAS)('%s no menciona Tilopay ni Stripe y nombra a ONVO', (rel) => {
    const src = leer(rel)
    expect(src).not.toMatch(/tilopay|stripe/i)
    expect(src).toMatch(/ONVO/)
  })

  it.each(['es', 'en'])('claves legales i18n (%s) sin Tilopay ni Stripe', (locale) => {
    const textos = clavesLegales(locale)
    expect(textos.length).toBeGreaterThan(0)
    for (const t of textos) expect(t).not.toMatch(/tilopay|stripe/i)
  })
})

describe('Privacidad: SINPE Móvil se confirma solo por webhook de ONVO', () => {
  it('la línea de SINPE no menciona comprobantes y exige el webhook de ONVO', () => {
    const linea = leer('../PrivacidadPage.tsx').split('\n').find((l) => /SINPE Móvil:/.test(l))
    expect(linea).toBeDefined()
    expect(linea).not.toMatch(/comprobante/i)
    expect(linea).toMatch(/webhook de ONVO/)
  })
})
