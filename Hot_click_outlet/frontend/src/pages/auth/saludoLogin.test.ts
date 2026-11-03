import { describe, expect, it } from 'vitest'
import { saludoLogin } from './authHelpers'

const t = (clave: string, o?: Record<string, unknown>) => (o ? `${clave}:${String(o.nombre)}` : clave)

describe('saludoLogin (QA5 área 2 fila 27)', () => {
  it('un dueño no ve «Admin»: lo saluda por su primer nombre', () => {
    expect(saludoLogin('EMPRENDEDOR', 'Dueño Ficticio', t)).toBe('login.welcomeNombre:Dueño')
  })
  it('solo ADMIN ve el saludo de Admin', () => {
    expect(saludoLogin('ADMIN', 'Persona', t)).toBe('login.welcomeAdmin')
  })
  it('sin nombre cae al saludo genérico', () => {
    expect(saludoLogin('USUARIO_FINAL', '  ', t)).toBe('login.welcome')
    expect(saludoLogin('GERENTE', null, t)).toBe('login.welcome')
  })
})
