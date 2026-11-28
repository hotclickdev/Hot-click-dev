import { describe, expect, it } from 'vitest'
import { anchoBarra, CAMPOS_PARAMETROS, cambios, colones, cuentaRegresiva, textoBorrador, tonoConfianza } from './contador'

describe('Contador IA: lógica de la pantalla', () => {
  it('sin dato muestra una raya, nunca un cero inventado', () => {
    expect(colones(null)).toBe('—')
    expect(colones(undefined)).toBe('—')
    expect(colones(1500)).toContain('1')
  })

  it('la barra de progreso queda entre 0 y 100', () => {
    expect(anchoBarra(150)).toBe(100)
    expect(anchoBarra(-3)).toBe(0)
    expect(anchoBarra(42.5)).toBe(42.5)
    expect(anchoBarra(null)).toBe(0)
  })

  it('el nivel de confianza tiene su tono', () => {
    expect(tonoConfianza('Seguro')).toBe('ok')
    expect(tonoConfianza('Verificar')).toBe('azul')
    expect(tonoConfianza('No sé')).toBe('alerta')
  })

  it('cuenta regresiva al vencimiento', () => {
    expect(cuentaRegresiva(0)).toBe('Vence hoy')
    expect(cuentaRegresiva(1)).toBe('Vence mañana')
    expect(cuentaRegresiva(5)).toBe('Faltan 5 días')
  })

  it('solo se envían los parámetros que cambiaron', () => {
    expect(cambios({ A: '1', B: '' }, { A: '1', B: '0.02' })).toEqual({ B: '0.02' })
    expect(cambios({ A: '1' }, { A: '1' })).toEqual({})
  })

  it('los factores del RTS y los formularios son editables', () => {
    const claves = CAMPOS_PARAMETROS.map((c) => c.clave)
    expect(claves).toEqual(expect.arrayContaining([
      'RTS_FACTOR_IVA_4719_9', 'RTS_FACTOR_RENTA_4719_9', 'RTS_FACTOR_IVA_4741_0', 'RTS_FACTOR_RENTA_4741_0',
      'RTS_FORMULARIO', 'TIPO_PERSONA', 'PERIODO_FISCAL_RENTA', 'FORMULARIO_INFORMATIVA',
    ]))
  })

  it('el borrador para copiar no inventa montos', () => {
    expect(textoBorrador([{ etiqueta: 'IVA a pagar', valor: 100 }, { etiqueta: 'Cuota', valor: null }]))
      .toBe('IVA a pagar: 100\nCuota: sin dato')
  })
})
