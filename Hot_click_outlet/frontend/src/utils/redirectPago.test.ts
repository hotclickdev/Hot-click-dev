import { describe, expect, it } from 'vitest'
import { esRedirectPagoPermitido } from './redirectPago'

const O = 'https://hotclick.lat'

describe('esRedirectPagoPermitido', () => {
  it.each([
    'https://checkout.stripe.com/c/pay/cs_test',
    'https://app.tilopay.com/x',
    'https://secure.tilopay.com/pay',
    'https://checkout.onvopay.com/abc',
    'https://hotclick.lat/pago/tilopay/respuesta',
    '/pago/resultado',
  ])('acepta %s', (url) => {
    expect(esRedirectPagoPermitido(url, O)).toBe(true)
  })

  it.each([
    'http://checkout.stripe.com/x',
    'https://evil.com/x',
    'https://stripe.com.evil.com/x',
    'https://evilstripe.com/x',
    'https://evil.checkout.onvopay.com/x',
    'https://api.onvopay.com/v1',
    'https://sdk.onvopay.com/x',
    'https://stripe.com/x',
    'https://hooks.stripe.com/x',
    'https://evil.app.tilopay.com/x',
    'https://checkout.onvopay.com:8443/x',
    'https://checkout.stripe.com:443x/x',
    'https://user:pw@checkout.stripe.com/x',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//evil.com/x',
    '',
    null,
    undefined,
  ])('rechaza %s', (url) => {
    expect(esRedirectPagoPermitido(url as string | null | undefined, O)).toBe(false)
  })

  it('puerto explícito en pasarela rechazado', () => {
    expect(esRedirectPagoPermitido('https://checkout.onvopay.com:8443/x', O, false)).toBe(false)
  })

  it('http en el propio origen solo en dev', () => {
    const L = 'http://localhost:5173'
    expect(esRedirectPagoPermitido('http://localhost:5173/pago', L, true)).toBe(true)
    expect(esRedirectPagoPermitido('http://localhost:5173/pago', L, false)).toBe(false)
    expect(esRedirectPagoPermitido('http://hotclick.lat/pago', O, true)).toBe(false)
  })
})
