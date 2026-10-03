import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from '@/i18n'
import AyudaPagoAsistente from './AyudaPagoAsistente'
import { contextoPagoFallo } from './pagoHelpers'

const aqui = dirname(fileURLToPath(import.meta.url))

describe('pago fallido · ayuda del asistente', () => {
  it('contexto PAGO_FALLO (con motivo corto y en una línea si lo hay)', () => {
    expect(contextoPagoFallo()).toBe('PAGO_FALLO')
    expect(contextoPagoFallo('  ')).toBe('PAGO_FALLO')
    expect(contextoPagoFallo('Fondos\ninsuficientes')).toBe('PAGO_FALLO:Fondos insuficientes')
    expect(contextoPagoFallo('x'.repeat(300))).toHaveLength('PAGO_FALLO:'.length + 120)
  })

  it('tres preguntas rápidas y la aclaración de que no ve la tarjeta', async () => {
    await i18n.changeLanguage('es')
    const html = renderToStaticMarkup(createElement(AyudaPagoAsistente, { numeroPedido: 'HC-10482' }))
    expect(html).toContain('Preguntale al asistente')
    expect(html).toContain('No ve datos de tu tarjeta.')
    for (const p of ['¿Por qué rechazaron mi tarjeta?', '¿Me cobraron algo?', '¿Cómo pago con SINPE Móvil?']) expect(html).toContain(p)
    expect(html.match(/<button/g)).toHaveLength(3)
    expect(i18n.t('payment.fallo.asistenteMensaje', { pregunta: '¿Me cobraron algo?', pedido: 'HC-10482' })).toBe('¿Me cobraron algo? (pedido HC-10482)')
  })

  it('en/pt traducidos', () => {
    for (const lng of ['en', 'pt']) {
      expect(i18n.getResource(lng, 'translation', 'payment.fallo.asistentePregunta1')).toBeTruthy()
      expect(i18n.getResource(lng, 'translation', 'payment.fallo.asistenteAyuda')).toBeTruthy()
    }
  })

  it('va en la pantalla de pago fallido/cancelado, después del resumen del pedido', () => {
    const fallo = readFileSync(resolve(aqui, 'FalloPago.tsx'), 'utf8')
    const ayuda = fallo.indexOf('<AyudaPagoAsistente ')
    expect(ayuda).toBeGreaterThan(fallo.indexOf('payment.fallo.pedido'))
    expect(fallo).toContain('motivo={motivo}')
  })
})
