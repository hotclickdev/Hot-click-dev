import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from '@/i18n'
import { claseBordeCodigo, formatoRebaja, saldoRestanteGiftCard } from './codigoDescuentoHelpers'
import { CampoCodigo, LineaCodigo, TituloValido } from './CodigoDescuento'

const aqui = dirname(fileURLToPath(import.meta.url))
const t = i18n.getFixedT('es')
const nada = () => {}

function campo(estado: string) {
  return renderToStaticMarkup(createElement(CampoCodigo, {
    valor: 'HC-GIFT-9Z1X',
    estado,
    placeholder: 'Código',
    ariaLabel: 'Código de tarjeta de regalo',
    maxLength: 30,
    onCambiar: nada,
    onAplicar: nada,
    onQuitar: nada,
    invalido: { titulo: t('checkout.codigo.giftInvalidoTitulo'), ayuda: t('checkout.codigo.giftInvalidoAyuda') },
    detalleValido: createElement(TituloValido, { texto: t('checkout.codigo.giftValidoTitulo') }),
    t,
  }))
}

describe('código de descuento · helpers', () => {
  it('borde por estado con tokens del sistema', () => {
    expect(claseBordeCodigo('valid')).toBe('border-hc-success')
    expect(claseBordeCodigo('invalid')).toBe('border-hc-red-500')
    expect(claseBordeCodigo('idle')).toBe('border-hc-border')
    expect(claseBordeCodigo('loading')).toBe('border-hc-border')
  })

  it('saldo restante nunca es negativo', () => {
    expect(saldoRestanteGiftCard(50000, 50000)).toBe(0)
    expect(saldoRestanteGiftCard(50000, 45900)).toBe(4100)
    expect(saldoRestanteGiftCard(1000, 5000)).toBe(0)
  })

  it('la rebaja lleva el signo menos y colones enteros', () => {
    expect(formatoRebaja(50000)).toBe('− ₡50.000')
  })
})

describe('código de descuento · presentación (Figma 55:2284 / 55:2220)', () => {
  it('inválido: borde rojo, aviso con ícono, título y ayuda, botón Aplicar', () => {
    const html = campo('invalid')
    expect(html).toContain('border-hc-red-500')
    expect(html).toContain('role="alert"')
    expect(html).toContain('bg-[var(--hc-danger-bg)]')
    expect(html).toContain('Código inválido, vencido o sin saldo')
    expect(html).toContain('Revisá que esté bien escrito.')
    expect(html).toContain('>Aplicar<')
    expect(html).toContain('aria-invalid="true"')
  })

  it('válido: borde verde, detalle verde y botón Quitar', () => {
    const html = campo('valid')
    expect(html).toContain('border-hc-success')
    expect(html).toContain('bg-[var(--hc-success-bg)]')
    expect(html).toContain('Tarjeta de regalo válida')
    expect(html).toContain('>Quitar<')
    expect(html).not.toContain('>Aplicar<')
  })

  it('reposo: sin aviso', () => {
    const html = campo('idle')
    expect(html).toContain('border-hc-border')
    expect(html).not.toContain('role="alert"')
    expect(html).not.toContain('--hc-success-bg')
  })

  it('las rebajas se pintan en verde de éxito', () => {
    const html = renderToStaticMarkup(createElement(LineaCodigo, { etiqueta: 'Se aplica', valor: '− ₡1', rebaja: true }))
    expect(html).toContain('text-hc-success')
  })

  it('CheckoutSummary ya no tiene colores hardcodeados ni textos fijos de gift card/cupón', () => {
    const resumen = readFileSync(resolve(aqui, 'CheckoutSummary.tsx'), 'utf8')
    expect(resumen).not.toMatch(/#f87171|#10b981|emerald-400|text-red-400/)
    expect(resumen).not.toContain('Código inválido, vencido o sin saldo')
    expect(resumen).not.toContain('¿Tenés una gift card?')
    expect(resumen).toContain('<TarjetaCodigos')
  })
})

describe('código de descuento · i18n', () => {
  it('todas las claves existen en es, en y pt', () => {
    const idiomas = ['es', 'en', 'pt'] as const
    const claves = Object.keys(i18n.getResourceBundle('es', 'translation').checkout.codigo)
    expect(claves.length).toBeGreaterThan(10)
    for (const lng of idiomas) {
      const codigo = i18n.getResourceBundle(lng, 'translation').checkout.codigo
      expect(Object.keys(codigo).sort()).toEqual([...claves].sort())
    }
  })

  it('las claves de la ficha agotada existen en es, en y pt', () => {
    const claves = [
      'restockTitle', 'restockNuevo', 'restockPlaceholder', 'restockEmailLabel', 'restockCta', 'restockSending',
      'restockInvalidEmail', 'restockError', 'restockSaved', 'restockWhatsapp', 'restockNoAccount',
      'buscarParecido', 'buscarParecidoMensaje', 'parecidosDisponibles', 'outOfStock',
    ]
    for (const lng of ['es', 'en', 'pt']) {
      const product = i18n.getResourceBundle(lng, 'translation').product
      for (const k of claves) expect(product[k], `${lng}.product.${k}`).toBeTruthy()
    }
  })
})
