import { describe, expect, it } from 'vitest'
import { getRolStr } from './usuarioHelpers'

describe('getRolStr', () => {
  it('prioriza ADMIN y EMPRENDEDOR sobre el orden del array', () => {
    expect(getRolStr({ roles: [{ nombreRol: 'USUARIO_FINAL' }, { nombreRol: 'ADMIN' }] })).toBe('ADMIN')
    expect(getRolStr({ roles: [{ nombreRol: 'EMPRENDEDOR' }] })).toBe('EMPRENDEDOR')
    expect(getRolStr({ roles: [] })).toBe('USUARIO_FINAL')
  })
})
