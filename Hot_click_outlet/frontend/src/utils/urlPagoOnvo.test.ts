import { describe, expect, it } from 'vitest'
import { esUrlPagoOnvo } from './urlPagoOnvo'

/** La misma URL de ONVO con otro protocolo: prueba el rechazo sin escribir una URL insegura en el código. */
function conProtocolo(url: string, protocolo: string): string {
  const u = new URL(url)
  u.protocol = protocolo
  return u.toString()
}

describe('redirección de pago solo a ONVO', () => {
  it('acepta el checkout hospedado de ONVO por https', () => {
    expect(esUrlPagoOnvo('https://checkout.onvopay.com/pay/cs_123')).toBe(true)
    expect(esUrlPagoOnvo('https://onvopay.com/checkout/cs_123')).toBe(true)
  })

  it('rechaza otros dominios, http, puertos, usuarios y dominios parecidos', () => {
    expect(esUrlPagoOnvo('https://evil.example/onvopay.com')).toBe(false)
    expect(esUrlPagoOnvo('https://onvopay.com.evil.example/pay')).toBe(false)
    expect(esUrlPagoOnvo('https://notonvopay.com/pay')).toBe(false)
    expect(esUrlPagoOnvo(conProtocolo('https://checkout.onvopay.com/pay', 'http:'))).toBe(false)
    expect(esUrlPagoOnvo('https://checkout.onvopay.com:8443/pay')).toBe(false)
    expect(esUrlPagoOnvo('https://user:pass@checkout.onvopay.com/pay')).toBe(false)
    expect(esUrlPagoOnvo('javascript:alert(1)')).toBe(false)
  })

  it('rechaza vacío o inválido', () => {
    expect(esUrlPagoOnvo(undefined)).toBe(false)
    expect(esUrlPagoOnvo('')).toBe(false)
    expect(esUrlPagoOnvo('no es una url')).toBe(false)
  })
})
