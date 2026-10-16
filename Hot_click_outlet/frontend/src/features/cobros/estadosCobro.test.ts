import { describe, expect, it } from 'vitest'
import { ESTADOS_COBRO, normalizarCuenta } from './cobrosOnvoApi'
import { TEXTO_PRIVACIDAD, VISTAS_ESTADO, textoFrecuencia } from './estadosCobro'

describe('S2-25 Activar cobros', () => {
  it('los 6 estados tienen color y texto', () => {
    expect(ESTADOS_COBRO).toHaveLength(6)
    for (const e of ESTADOS_COBRO) {
      expect(VISTAS_ESTADO[e].etiqueta).toBeTruthy()
      expect(VISTAS_ESTADO[e].tono).toBeTruthy()
    }
  })

  it('la CTA roja aparece solo en Sin cuenta y Onboarding pendiente', () => {
    const conCta = ESTADOS_COBRO.filter((e) => VISTAS_ESTADO[e].cta !== null)
    expect(conCta).toEqual(['SIN_CUENTA', 'ONBOARDING_PENDIENTE'])
  })

  it('usa el texto de privacidad aprobado y no muestra montos que no sean los US$3', () => {
    expect(TEXTO_PRIVACIDAD).toContain('Tu IBAN solo lo ven vos y el equipo de HotClick para hacerte los pagos.')
    const textos = Object.values(VISTAS_ESTADO).map((v) => v.mensaje).join(' ')
    expect(textos).not.toMatch(/₡|\d+\s?%/)
    expect(textoFrecuencia('QUINCENAL').titulo).toBe('Quincenal · US$3 por liquidación')
    expect(textoFrecuencia('MENSUAL').detalle).toContain('US$3 al mes')
  })

  it('normaliza la respuesta del contrato supuesto', () => {
    expect(normalizarCuenta({ data: { estado: 'ACTIVA', frecuencia: 'MENSUAL' } })).toEqual({ estado: 'ACTIVA', frecuencia: 'MENSUAL', pausadaEl: null })
    expect(normalizarCuenta({ estado: 'RARO' }).estado).toBe('SIN_CUENTA')
  })
})
