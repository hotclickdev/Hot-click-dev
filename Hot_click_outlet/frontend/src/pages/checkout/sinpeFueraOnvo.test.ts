import { describe, expect, it, vi } from 'vitest'
import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'
import CheckoutSinpePending from './CheckoutSinpePending'
import { METODOS_CAJA } from '@/pages/admin/pos/posHelpers'

// El marco de pago trae el header (usa window); aquí solo interesa el contenido de la pantalla.
vi.mock('@/pages/pago/PiezasPago', () => ({
  MarcoPago: ({ children }: { children?: unknown }) => children,
  BotonPago: () => null,
}))

const noop = () => {}

function renderSinToken(): string {
  const props = {
    pagoData: { numeroPedido: 'HC-123', proveedor: 'SINPE' },
    totalFinal: 15000,
    sinpeNombre: '', sinpeCedula: '', sinpeTelefono: '',
    sinpeImagen: null, setSinpeImagen: noop, sinpeImagenErr: '', setSinpeImagenErr: noop,
    sinpeUploadEstado: 'idle', setSinpeUploadEstado: noop, sinpeUploadError: '', setSinpeUploadError: noop,
    sinpeInputRef: createRef<HTMLInputElement>(), onSubirComprobante: noop, onSinpeWhatsApp: noop,
  }
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CheckoutSinpePending, props)))
}

describe('SINPE solo dentro de ONVO', () => {
  it('sin token de ONVO no muestra número, titular ni pide comprobante', () => {
    const html = renderSinToken()
    expect(html).toContain('Pago SINPE disponible pronto dentro de la pasarela segura')
    expect(html).not.toMatch(/\d{4}[\s-]?\d{4}/)
    expect(html).not.toContain(es.payment.sinpe.titular)
    expect(html).not.toContain('type="file"')
    expect(html.toLowerCase()).not.toContain('comprobante')
  })

  it('el aviso está en es, en y pt', () => {
    expect(es.payment.sinpe.pasarelaPronto).toBe('Pago SINPE disponible pronto dentro de la pasarela segura')
    expect(en.payment.sinpe.pasarelaPronto).toBeTruthy()
    expect(pt.payment.sinpe.pasarelaPronto).toBeTruthy()
  })

  it('la caja no ofrece SINPE, así que no genera QR SINPE (QA-NEG-056)', () => {
    expect(METODOS_CAJA.map((m) => m.id)).not.toContain('SINPE')
  })
})
