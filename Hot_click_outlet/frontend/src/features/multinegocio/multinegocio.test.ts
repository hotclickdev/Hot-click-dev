import { describe, expect, it } from 'vitest'
import { TEXTOS_MULTINEGOCIO, TEXTO_CUPO_NEGOCIOS, TEXTO_NOMBRE_EN_USO, mensajeErrorNuevoNegocio, mensajeSinAcceso, nombrePlan } from './multinegocioTextos'

describe('S2 multinegocio', () => {
  it('usa el copy aprobado', () => {
    expect(TEXTOS_MULTINEGOCIO.elegirTitulo).toBe('Elegí tu negocio')
    expect(TEXTOS_MULTINEGOCIO.entraste('Tienda Sofi')).toBe('Entraste a Tienda Sofi.')
    expect(TEXTOS_MULTINEGOCIO.sinAccesoTitulo).toBe('No tenés acceso a este negocio')
  })

  it('muestra el plan solo si el backend lo manda (no se inventa)', () => {
    expect(nombrePlan('NEGOCIO_PLUS')).toBe('Negocio Plus')
    expect(nombrePlan(undefined)).toBeNull()
    expect(nombrePlan('OTRO')).toBeNull()
  })

  it('#201: 403 SIN_ACCESO_NEGOCIO muestra el estado sin acceso; otros errores no', () => {
    const e = { response: { status: 403, data: { success: false, code: 'SIN_ACCESO_NEGOCIO', message: 'No tenés acceso a ese negocio' } } }
    expect(mensajeSinAcceso(e)).toBe('No tenés acceso a este negocio. Ese emprendimiento no está en tu cuenta o no podés verlo.')
    expect(mensajeSinAcceso({ response: { status: 401 } })).toBeNull()
  })

  it('#176: 409 NOMBRE_NEGOCIO_EN_USO y CUPO_NEGOCIOS en «Crear otro negocio»', () => {
    const e = (code: string, message?: string) => ({ response: { status: 409, data: { success: false, code, message } } })
    expect(mensajeErrorNuevoNegocio(e('NOMBRE_NEGOCIO_EN_USO', 'x'))).toBe(TEXTO_NOMBRE_EN_USO)
    expect(mensajeErrorNuevoNegocio(e('CUPO_NEGOCIOS', 'Alcanzaste el límite de 20 negocios por cuenta'))).toBe('Alcanzaste el límite de 20 negocios por cuenta')
    expect(mensajeErrorNuevoNegocio(e('CUPO_NEGOCIOS'))).toBe(TEXTO_CUPO_NEGOCIOS)
    expect(mensajeErrorNuevoNegocio({ response: { status: 400, data: { message: 'correo en uso' } } })).toBeNull()
  })
})
