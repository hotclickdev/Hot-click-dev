import { describe, expect, it } from 'vitest'
import { validateGuestPhone, validatePhone } from './checkoutHelpers'

const t = (key: string) => key

describe('validateGuestPhone', () => {
  it('no exige teléfono en retiro en tienda', () => {
    expect(validateGuestPhone('', 'RETIRO_EN_TIENDA', t)).toBe('')
  })

  it('exige 8 dígitos para envío', () => {
    expect(validateGuestPhone('', 'ENVIO_NORMAL_GAM', t)).toBe('checkout.phoneRequired')
    expect(validateGuestPhone('8888', 'ENVIO_NORMAL_GAM', t)).toBe('checkout.phoneInvalid')
    expect(validateGuestPhone('88887777', 'ENVIO_NORMAL_GAM', t)).toBe('')
  })

  it('validatePhone exige dígitos CR', () => {
    expect(validatePhone('50688887777', t)).toBe('')
  })
})
