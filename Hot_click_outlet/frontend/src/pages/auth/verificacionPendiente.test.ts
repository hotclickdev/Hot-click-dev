import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  CLAVE_CORREO_PENDIENTE, esCuentaPendiente, guardarCorreoPendiente, leerCorreoPendiente,
  limpiarCorreoPendiente, pasoInicialRegistro, reenviarCodigoRegistro,
} from './verificacionPendiente'

function memoria() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
    m,
  }
}

const leer = (f: string) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')

describe('QA4-004 registro → paso del código', () => {
  it('tras un envío exitoso el registro arranca en el paso del código con ese correo', () => {
    const s = memoria()
    expect(pasoInicialRegistro(s)).toBe('form')
    guardarCorreoPendiente('  Persona@Correo.CR ', s)
    expect(pasoInicialRegistro(s)).toBe('verify')
    expect(leerCorreoPendiente(s)).toBe('persona@correo.cr')
    limpiarCorreoPendiente(s)
    expect(pasoInicialRegistro(s)).toBe('form')
  })

  it('solo guarda el correo (nunca cédula ni código)', () => {
    const s = memoria()
    guardarCorreoPendiente('a@b.cr', s)
    expect([...s.m.keys()]).toEqual([CLAVE_CORREO_PENDIENTE])
    expect([...s.m.values()]).toEqual(['a@b.cr'])
  })

  it('sin storage disponible no revienta y queda en el formulario', () => {
    expect(pasoInicialRegistro(null)).toBe('form')
    expect(() => guardarCorreoPendiente('a@b.cr', null)).not.toThrow()
  })

  it('el hook guarda el correo tras sendVerification y lo limpia al verificar o volver', () => {
    const src = leer('useRegisterFlow.ts')
    expect(src).toMatch(/sendVerification\([\s\S]*?guardarCorreoPendiente\(trimmed\.correo\)[\s\S]*?setStep\('verify'\)/)
    expect(src).toContain('useState<string>(() => pasoInicialRegistro())')
    expect(src).toMatch(/verifyRegistration[\s\S]*?limpiarCorreoPendiente\(\)/)
  })

  it('el reenvío del registro manda solo el correo (sin cédula ni contraseña)', async () => {
    const enviar = vi.fn().mockResolvedValue({})
    expect(await reenviarCodigoRegistro(' A@B.cr ', enviar)).toBe('enviado')
    expect(enviar).toHaveBeenCalledWith({ correo: 'a@b.cr' })
    const src = leer('useRegisterFlow.ts')
    const reenvio = src.slice(src.indexOf('const handleReenviar'), src.indexOf('const volverAlFormulario'))
    expect(reenvio).not.toMatch(/identificacion|contrasenaHash|\.\.\.form/)
  })

  it('el reenvío distingue rate limit y error sin exponer el mensaje del backend', async () => {
    expect(await reenviarCodigoRegistro('a@b.cr', vi.fn().mockRejectedValue({ response: { status: 429 } }))).toBe('limite')
    expect(await reenviarCodigoRegistro('a@b.cr', vi.fn().mockRejectedValue({ response: { status: 400, data: { message: 'El correo ya está registrado' } } }))).toBe('error')
  })
})

describe('QA4-004 login no verificado → opción de código', () => {
  it('reconoce el 403 de cuenta pendiente, no el bloqueo ni credenciales inválidas', () => {
    expect(esCuentaPendiente(403, 'Verificá tu correo para activar la cuenta.')).toBe(true)
    expect(esCuentaPendiente(403, 'Cuenta bloqueada temporalmente')).toBe(false)
    expect(esCuentaPendiente(401, 'Credenciales inválidas')).toBe(false)
    expect(esCuentaPendiente(undefined, '')).toBe(false)
  })

  it('el login pasa al paso del código y LoginPage reutiliza RegisterVerifyStep', () => {
    const flow = leer('useLoginFlow.ts')
    expect(flow).toMatch(/esCuentaPendiente\(status, msg\)[\s\S]*?setStep\('verificar-correo'\)/)
    expect(flow).toMatch(/verifyRegistration\(correo/)
    const page = leer('../LoginPage.tsx')
    expect(page).toMatch(/step === 'verificar-correo'[\s\S]*?<RegisterVerifyStep/)
    expect(page).toContain('onReenviar={handleResendVerification}')
  })

  it('el reenvío del login manda solo el correo con el token anti-bot', () => {
    const flow = leer('useLoginFlow.ts')
    const reenvio = flow.slice(flow.indexOf('const handleResendVerification'), flow.indexOf('const handleVerificarCorreo'))
    expect(reenvio).toContain('reenviarCodigoRegistro(correo')
    expect(reenvio).toContain('turnstileToken')
    expect(reenvio).not.toMatch(/contrasena/)
  })
})
