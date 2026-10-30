import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { puedeCambiar2FA } from './cuentaHelpers'

// QA4-010: el interruptor de 2FA de Mi cuenta estaba deshabilitado para el comprador.
describe('QA4-010 interruptor de 2FA', () => {
  it('lo habilita para el comprador y los demás roles con sesión', () => {
    for (const rol of ['USUARIO_FINAL', 'EMPRENDEDOR', 'ADMIN']) expect(puedeCambiar2FA(rol)).toBe(true)
  })
  it('no lo habilita sin sesión', () => {
    expect(puedeCambiar2FA(null)).toBe(false)
    expect(puedeCambiar2FA(undefined)).toBe(false)
    expect(puedeCambiar2FA('')).toBe(false)
  })
  it('ProfilePage ya no lo restringe a administradores', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(path.resolve(dir, '../../ProfilePage.tsx'), 'utf8')
    expect(src).not.toMatch(/puedeCambiar2FA=\{isAdmin\(\)\}/)
    expect(src).toMatch(/puedeCambiar2FA=\{puedeCambiar2FA\(userRole\)\}/)
  })
})
