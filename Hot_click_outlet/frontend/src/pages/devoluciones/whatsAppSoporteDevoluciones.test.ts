import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/soporteTelefono', async (orig) => ({
  ...(await orig<typeof import('@/config/soporteTelefono')>()),
  SOPORTE_WA: '00000000000',
  SOPORTE_TELEFONO: '+000 0000 0000',
}))
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
  it('el número del frontend sale de VITE_SOPORTE_TELEFONO (sin literales)', () => {
    expect(WHATSAPP).toBe(WHATSAPP_HOTCLICK)
    expect(leer('../carrito/cartHelpers.ts')).not.toMatch(/WHATSAPP_HOTCLICK = '\d/)
  })

  it('enlaza a wa.me con el número de HotClick y lo muestra formateado', () => {
    const html = renderToStaticMarkup(createElement(WhatsAppSoporteDevoluciones))
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1])
    expect(hrefs).toHaveLength(1)
    expect(hrefs[0]).toMatch(new RegExp(`^https://wa\\.me/${WHATSAPP_HOTCLICK}\\?text=`))
    expect(html).toContain('Escribinos por WhatsApp')
    expect(html).toContain(`Soporte HotClick · ${whatsAppVisible('00000000000')}`)
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
    expect(whatsAppVisible('50600000000')).toBe('+506 0000 0000')
    expect(whatsAppVisible('12300000000')).toBe('+12300000000')
  })
})
