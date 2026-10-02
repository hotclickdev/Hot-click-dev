import { describe, expect, it } from 'vitest'
import {
  contrasenaAceptable,
  correoDesdeEstado,
  formatearCuentaRegresiva,
  normalizarCodigo,
  requisitosContrasena,
} from './recuperarHelpers'

describe('requisitosContrasena', () => {
  it('marca el largo entre 8 y 128', () => {
    expect(requisitosContrasena('corta', 'a@b.com').largo).toBe(false)
    expect(requisitosContrasena('x'.repeat(8), 'a@b.com').largo).toBe(true)
    expect(requisitosContrasena('x'.repeat(128), 'a@b.com').largo).toBe(true)
    expect(requisitosContrasena('x'.repeat(129), 'a@b.com').largo).toBe(false)
  })

  it('rechaza la contraseña igual al correo sin importar mayúsculas', () => {
    expect(requisitosContrasena('Ana.Solis@gmail.com', 'ana.solis@gmail.com').distintaDelCorreo).toBe(false)
    expect(requisitosContrasena('otra-clave-123', 'ana.solis@gmail.com').distintaDelCorreo).toBe(true)
  })

  it('no marca "distinta del correo" con el campo vacío', () => {
    expect(requisitosContrasena('', 'ana@b.com').distintaDelCorreo).toBe(false)
  })

  it('la combinación de letras, números y símbolos es solo sugerencia', () => {
    expect(requisitosContrasena('clave1234', 'a@b.com').combinada).toBe(false)
    expect(requisitosContrasena('clave-1234', 'a@b.com').combinada).toBe(true)
    expect(contrasenaAceptable('frase larga sin numeros', 'a@b.com')).toBe(true)
  })
})

describe('normalizarCodigo', () => {
  it('deja solo 6 dígitos al pegar texto', () => {
    expect(normalizarCodigo('Código: 482 913')).toBe('482913')
    expect(normalizarCodigo('12345678')).toBe('123456')
  })
})

describe('formatearCuentaRegresiva', () => {
  it('formatea minutos y segundos como en el Figma', () => {
    expect(formatearCuentaRegresiva(42)).toBe('0:42')
    expect(formatearCuentaRegresiva(75)).toBe('1:15')
    expect(formatearCuentaRegresiva(-3)).toBe('0:00')
  })
})

describe('correoDesdeEstado', () => {
  it('lee el correo que manda el login y descarta lo demás', () => {
    expect(correoDesdeEstado({ correo: 'ana@b.com' })).toBe('ana@b.com')
    expect(correoDesdeEstado({ correo: 3 })).toBe('')
    expect(correoDesdeEstado(null)).toBe('')
  })
})
