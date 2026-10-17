import { describe, expect, it } from 'vitest'
import { claveCerrado, debeMostrarBanner, normalizarEstadoOnvo, rutaMisCobros } from './bannerCobrosApi'

describe('S6-20 banner de cobros activos', () => {
  const base = { estadoEmpresa: 'ACTIVO', visibilidadPublica: true, estadoOnvo: 'ACTIVA' as const, cerrado: false }
  it('solo con tienda activa y cuenta ONVO Activa', () => {
    expect(debeMostrarBanner(base)).toBe(true)
    expect(debeMostrarBanner({ ...base, estadoOnvo: 'ONBOARDING_PENDIENTE' })).toBe(false)
    expect(debeMostrarBanner({ ...base, estadoOnvo: 'PAUSADA' })).toBe(false)
    expect(debeMostrarBanner({ ...base, estadoOnvo: null })).toBe(false)
    expect(debeMostrarBanner({ ...base, estadoEmpresa: 'PENDIENTE_APROBACION' })).toBe(false)
    expect(debeMostrarBanner({ ...base, visibilidadPublica: false })).toBe(false)
  })
  it('cerrado no se muestra y la clave es por negocio', () => {
    expect(debeMostrarBanner({ ...base, cerrado: true })).toBe(false)
    expect(claveCerrado(7)).not.toBe(claveCerrado(8))
  })
  it('normaliza el estado con o sin envoltura data', () => {
    expect(normalizarEstadoOnvo({ data: { estado: 'activa' } })).toBe('ACTIVA')
    expect(normalizarEstadoOnvo({ estado: 'X' })).toBeNull()
    expect(normalizarEstadoOnvo({ success: true, data: { estado: 'EN_REVISION', frecuencia: null, pausadaEl: null, motivoPausa: null } })).toBe('EN_REVISION')
    expect(normalizarEstadoOnvo({ estado: 'SIN_REGISTRAR' })).toBeNull()
    expect(normalizarEstadoOnvo(null)).toBeNull()
  })
  it('Ver mis cobros va a Mis ventas del panel actual', () => {
    expect(rutaMisCobros('/pyme/inicio')).toBe('/pyme/ventas-semana')
    expect(rutaMisCobros('/')).toBe('/emprendedor/ventas-semana')
  })
})
