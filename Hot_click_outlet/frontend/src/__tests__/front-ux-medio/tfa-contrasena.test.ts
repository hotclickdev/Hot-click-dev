import { describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn().mockResolvedValue({ data: {} }) }))
vi.mock('@/services/api', () => ({ default: { post } }))

import { authService } from '@/services/authService'
import { archivosFuente, leer } from './helpers'

describe('2FA: setup y activate llevan la contraseña actual', () => {
  it('setup2FA manda { contrasena }', async () => {
    await authService.setup2FA('Clave1234!')
    expect(post).toHaveBeenCalledWith('/auth/2fa/setup', { contrasena: 'Clave1234!' })
  })
  it('activate2FA manda { code, contrasena }', async () => {
    await authService.activate2FA('123456', 'Clave1234!')
    expect(post).toHaveBeenCalledWith('/auth/2fa/activate', { code: '123456', contrasena: 'Clave1234!' })
  })
  it('las pantallas piden la contraseña antes de configurar (hay campo y paso de contraseña)', () => {
    expect(archivosFuente().some((f) => f.endsWith('tfa/TfaPasswordStep.tsx'))).toBe(true)
    expect(leer('pages/perfil/TwoFAModal.tsx')).toContain('setup2FA(contrasena)')
    expect(leer('pages/admin/configuracion/Panel2FA.tsx')).toContain('setup2FA(password)')
  })
})
