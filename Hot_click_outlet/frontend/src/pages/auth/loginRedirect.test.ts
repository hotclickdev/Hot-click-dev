import { describe, expect, it } from 'vitest'
import { debeRespetarRedirect, destinoPostLogin } from './authHelpers'

describe('login respeta ?redirect=', () => {
  it('usa el redirect explícito y saneado', () => {
    expect(debeRespetarRedirect('/admin/pedidos', destinoPostLogin('/admin/pedidos'))).toBe(true)
    expect(debeRespetarRedirect(null, '/admin')).toBe(false)
    expect(debeRespetarRedirect('https://evil.com', destinoPostLogin('https://evil.com'))).toBe(false)
  })
})
