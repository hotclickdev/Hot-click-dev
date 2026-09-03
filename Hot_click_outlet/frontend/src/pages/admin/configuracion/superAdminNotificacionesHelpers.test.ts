import { describe, expect, it } from 'vitest'
import { alertasDesdeColas } from './superAdminNotificacionesHelpers'

describe('alertasDesdeColas', () => {
  it('no inventa alerta de productos aunque haya data legacy', () => {
    const alertas = alertasDesdeColas(
      [{ id: 1, estadoEmpresa: 'PENDIENTE_APROBACION' }],
      0,
    )
    expect(alertas.some((a) => a.id === 'productos')).toBe(false)
    expect(alertas.some((a) => a.id === 'tiendas')).toBe(true)
  })

  it('incluye ofertas cuando hay conteo', () => {
    const alertas = alertasDesdeColas([], 2)
    expect(alertas[0]?.id).toBe('ofertas')
  })
})
