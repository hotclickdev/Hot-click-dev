import { describe, expect, it, vi, beforeEach } from 'vitest'

const post = vi.fn()
vi.mock('@/services/api', () => ({ default: { post: (...a: unknown[]) => post(...a) } }))

import { authService } from '@/services/authService'
import { COOLDOWN_REENVIO_SEG, esCuentaSinVerificar } from './reenvioVerificacion'

describe('QA4-004: botón «Reenviar correo» en /login', () => {
  beforeEach(() => post.mockReset())

  it('aparece solo con el 403 de cuenta sin verificar', () => {
    expect(esCuentaSinVerificar(403, 'Verificá tu correo para activar la cuenta.')).toBe(true)
    expect(esCuentaSinVerificar(403, 'Cuenta temporalmente bloqueada por múltiples intentos fallidos.')).toBe(false)
    expect(esCuentaSinVerificar(401, 'Verificá tu correo para activar la cuenta.')).toBe(false)
  })

  it('llama al endpoint público con el correo escrito', async () => {
    post.mockResolvedValue({ data: {} })
    await authService.reenviarVerificacion('persona@example.com')
    expect(post).toHaveBeenCalledWith('/auth/reenviar-verificacion', { correo: 'persona@example.com' })
  })

  it('tiene enfriamiento entre reenvíos', () => {
    expect(COOLDOWN_REENVIO_SEG).toBeGreaterThanOrEqual(30)
  })
})
