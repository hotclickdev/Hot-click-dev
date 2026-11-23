import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const leer = (ruta: string) => readFileSync(resolve(__dirname, ruta), 'utf8')

/**
 * O7 (QA final 23-nov): el OTP del registro de comprador lo manda /auth/send-verification, no /auth/register.
 * La UI debe encadenarlo (documenta el contrato para que nadie «arregle» con un doble POST).
 */
describe('Registro: el código de verificación sale por send-verification', () => {
  const flujo = leer('./useRegisterFlow.ts')
  const submit = flujo.slice(flujo.indexOf('const handleSubmit'), flujo.indexOf('const handleVerify'))

  it('handleSubmit envía el código con sendVerification y pasa al paso verify', () => {
    expect(submit).toContain('authService.sendVerification(')
    expect(submit).toContain("setStep('verify')")
  })

  it('el flujo de comprador no llama a authService.register (sin doble POST)', () => {
    expect(flujo).not.toMatch(/authService\.register\(/)
  })

  it('el reenvío usa el mismo camino', () => {
    const reenvio = flujo.slice(flujo.indexOf('const handleReenviar'))
    expect(reenvio).toContain('authService.sendVerification(')
  })

  it('el registro de empresa usa registroEmpresa (el backend emite el OTP en ese endpoint)', () => {
    expect(leer('../RegistroEmpresaPage.tsx')).toContain('authService.registroEmpresa(')
    expect(leer('./EmprendimientoForm.tsx')).toContain('authService.registroEmpresa(')
  })
})
