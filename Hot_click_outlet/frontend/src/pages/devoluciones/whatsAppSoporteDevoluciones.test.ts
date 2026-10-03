import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import WhatsAppSoporteDevoluciones from './WhatsAppSoporteDevoluciones'
import { WHATSAPP_HOTCLICK, whatsAppVisible } from '@/pages/carrito/cartHelpers'
import { WHATSAPP } from '@/pages/checkout/checkoutHelpers'

const aqui = dirname(fileURLToPath(import.meta.url))
const leer = (rel: string) => readFileSync(resolve(aqui, rel), 'utf8')

describe('Devoluciones · WhatsApp de soporte (solo HotClick)', () => {
  it('el número del frontend es el de ContactoPublicoPolicy.WHATSAPP_HOTCLICK', () => {
    const politica = leer('../../../../src/main/java/com/hotclick/service/contacto/ContactoPublicoPolicy.java')
    const m = /WHATSAPP_HOTCLICK\s*=\s*"(\d+)"/.exec(politica)
    expect(m?.[1]).toBe(WHATSAPP_HOTCLICK)
    expect(WHATSAPP).toBe(WHATSAPP_HOTCLICK)
  })

  it('enlaza a wa.me con el número de HotClick y lo muestra formateado', () => {
    const html = renderToStaticMarkup(createElement(WhatsAppSoporteDevoluciones))
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1])
    expect(hrefs).toHaveLength(1)
    expect(hrefs[0]).toMatch(new RegExp(`^https://wa\\.me/${WHATSAPP_HOTCLICK}\\?text=`))
    expect(html).toContain('Escribinos por WhatsApp')
    expect(html).toContain('Soporte HotClick · +506 8666 7888')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('nunca usa datos de contacto del vendedor', () => {
    const fuente = leer('WhatsAppSoporteDevoluciones.tsx')
    expect(fuente).not.toMatch(/empresa|vendedor\w*\.|tienda\w*\.|contactoDirecto|whatsappNegocio|telefono/i)
  })

  it('va en la tarjeta "¿Tenés un problema con tu pedido?", debajo del correo', () => {
    const pagina = leer('../DevolucionesPage.tsx')
    expect(pagina).toContain('accion={<WhatsAppSoporteDevoluciones />}')
    const legal = leer('../../components/comprador/PaginaLegal.tsx')
    expect(legal.indexOf('{accion}')).toBeGreaterThan(legal.indexOf('href={`mailto:${correo}`}'))
  })

  it('whatsAppVisible', () => {
    expect(whatsAppVisible('50686667888')).toBe('+506 8666 7888')
    expect(whatsAppVisible('15551234567')).toBe('+15551234567')
  })
})
