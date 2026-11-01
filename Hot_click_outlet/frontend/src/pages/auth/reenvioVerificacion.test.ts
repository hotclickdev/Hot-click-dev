import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { reenviarCodigo, verificarCodigoCuenta } from './reenvioVerificacion'

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

describe('QA4-013: reenvío fail-closed', () => {
  it('2xx → ok', async () => {
    const enviar = vi.fn().mockResolvedValue({ data: {} })
    expect(await reenviarCodigo(enviar, '  Persona@Example.com ', 'err')).toEqual({ ok: true })
    expect(enviar).toHaveBeenCalledWith('persona@example.com')
  })
  it('429 del tope de códigos → error con el mensaje real, nunca «te enviamos»', async () => {
    const enviar = vi.fn().mockRejectedValue({ response: { status: 429, data: { message: 'Demasiadas solicitudes. Esperá unos minutos e intentá de nuevo.' } } })
    const r = await reenviarCodigo(enviar, 'a@b.cr', 'err')
    expect(r).toEqual({ ok: false, mensaje: 'Demasiadas solicitudes. Esperá unos minutos e intentá de nuevo.' })
  })
  it('503 / red caída sin mensaje → error genérico', async () => {
    expect(await reenviarCodigo(vi.fn().mockRejectedValue(new Error('net')), 'a@b.cr', 'err')).toEqual({ ok: false, mensaje: 'err' })
  })
})

describe('QA4-004: verificar el código desde /login', () => {
  it('código incompleto → no llama al backend', async () => {
    const verificar = vi.fn()
    expect(await verificarCodigoCuenta(verificar, 'a@b.cr', '123', 'seis', 'err')).toEqual({ ok: false, mensaje: 'seis' })
    expect(verificar).not.toHaveBeenCalled()
  })
  it('código válido → usa verify-registration y devuelve la sesión', async () => {
    const verificar = vi.fn().mockResolvedValue({ data: { success: true, data: { accessToken: 't' } } })
    const r = await verificarCodigoCuenta(verificar, ' A@B.cr ', '482 913', 'seis', 'err')
    expect(verificar).toHaveBeenCalledWith('a@b.cr', '482913')
    expect(r).toEqual({ ok: true, data: { accessToken: 't' } })
  })
  it('código incorrecto → mensaje del backend', async () => {
    const verificar = vi.fn().mockRejectedValue({ response: { data: { message: 'Código incorrecto' } } })
    expect(await verificarCodigoCuenta(verificar, 'a@b.cr', '000000', 'seis', 'err')).toEqual({ ok: false, mensaje: 'Código incorrecto' })
  })
  it('/login monta el paso de código de /registro (RegisterVerifyStep) y no reenvía solo', () => {
    const page = readFileSync(resolve(__dirname, '../LoginPage.tsx'), 'utf8')
    expect(page).toContain("import RegisterVerifyStep from './auth/RegisterVerifyStep'")
    expect(page).toContain('step === PASO_VERIFICAR_CORREO')
    const flow = readFileSync(resolve(__dirname, 'useLoginFlow.ts'), 'utf8')
    const login = flow.slice(flow.indexOf('const handleLogin'), flow.indexOf('const handleResendVerification'))
    expect(login).not.toContain('reenviarVerificacion')
  })
})
