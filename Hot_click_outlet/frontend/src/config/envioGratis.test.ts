import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from '@/i18n'
import BarraEnvioGratis from '@/components/comprador/BarraEnvioGratis'
import { UMBRAL_ENVIO_GRATIS, normalizarUmbralEnvioGratis, progresoEnvioGratis } from './envioGratis'

const aqui = dirname(fileURLToPath(import.meta.url))
const leer = (rel: string) => readFileSync(resolve(aqui, rel), 'utf8')
const config = JSON.parse(leer('../../../src/main/resources/config/tiempos-envio.json'))

describe('envío gratis · config compartida', () => {
  it('el umbral sale de tiempos-envio.json (envioGratis.desdeColones)', () => {
    expect(config.envioGratis).toHaveProperty('desdeColones')
    expect(UMBRAL_ENVIO_GRATIS).toBe(normalizarUmbralEnvioGratis(config.envioGratis.desdeColones))
  })

  it('hoy no hay umbral: el checkout cobra tarifa fija y no hay que prometer envío gratis', () => {
    // Si esto cambia, primero hay que aplicar el envío gratis en OrderPricingService y en SHIPPING_COSTS.
    expect(config.envioGratis.desdeColones).toBeNull()
    expect(UMBRAL_ENVIO_GRATIS).toBeNull()
    expect(leer('../pages/checkout/checkoutHelpers.ts')).not.toMatch(/envioGratis|ENVIO_GRATIS/i)
  })

  it('con umbral, el cobro lo tiene que aplicar (backend y checkout)', () => {
    if (UMBRAL_ENVIO_GRATIS == null) return
    expect(leer('../../../src/main/java/com/hotclick/service/payment/OrderPricingService.java')).toMatch(/envioGratis/i)
    expect(leer('../pages/checkout/useCheckoutForm.ts')).toMatch(/UMBRAL_ENVIO_GRATIS/)
  })

  it('normaliza: null, texto, 0 o negativo = sin envío gratis', () => {
    expect(normalizarUmbralEnvioGratis(null)).toBeNull()
    expect(normalizarUmbralEnvioGratis('15000')).toBeNull()
    expect(normalizarUmbralEnvioGratis(0)).toBeNull()
    expect(normalizarUmbralEnvioGratis(-1)).toBeNull()
    expect(normalizarUmbralEnvioGratis(Number.NaN)).toBeNull()
    expect(normalizarUmbralEnvioGratis(20000)).toBe(20000)
  })

  it('progreso: falta y porcentaje acotados', () => {
    expect(progresoEnvioGratis(5000, 20000)).toEqual({ falta: 15000, porcentaje: 25, listo: false })
    expect(progresoEnvioGratis(25000, 20000)).toEqual({ falta: 0, porcentaje: 100, listo: true })
    expect(progresoEnvioGratis(-10, 20000)).toEqual({ falta: 20000, porcentaje: 0, listo: false })
  })
})

describe('BarraEnvioGratis (hoja Agregado, Figma 45:1607)', () => {
  const html = (props: { subtotal: number; umbral?: number | null }) => renderToStaticMarkup(createElement(BarraEnvioGratis, props))

  it('sin umbral configurado no dibuja nada', () => {
    expect(html({ subtotal: 9000 })).toBe('')
    expect(html({ subtotal: 9000, umbral: null })).toBe('')
    expect(html({ subtotal: 9000, umbral: 0 })).toBe('')
  })

  it('con umbral muestra cuánto falta, con el monto en negrita', async () => {
    await i18n.changeLanguage('es')
    const out = html({ subtotal: 5000, umbral: 20000 })
    expect(out).toContain('data-testid="barra-envio-gratis"')
    expect(out).toMatch(/Te faltan <b[^>]*>₡\s?15[.,\s]000<\/b> para envío gratis/)
    expect(out).toContain('width:25%')
  })

  it('al llegar al umbral confirma el envío gratis', async () => {
    await i18n.changeLanguage('es')
    expect(html({ subtotal: 20000, umbral: 20000 })).toContain('Tu pedido ya tiene envío gratis')
  })

  it('la hoja la usa con el subtotal del paquete de la misma tienda', () => {
    const hoja = leer('../components/comprador/HojaAgregadoAlPedido.tsx')
    expect(hoja).toContain('<BarraEnvioGratis subtotal={subtotalPaquete} />')
    expect(hoja).toMatch(/subtotalPaquete = mismoPaquete\.reduce/)
    expect(hoja).not.toMatch(/15[.,]?000/)
  })
})
