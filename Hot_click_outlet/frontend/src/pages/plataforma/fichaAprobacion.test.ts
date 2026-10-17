import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cuentaAprobadaDe, esPendienteAprobacion, mensajeConfirmarAprobacion } from './fichaAprobacion'

describe('Ficha de tienda: Aprobar negocio', () => {
  it('detecta pendiente y avisa sin cuenta de cobro', () => {
    expect(esPendienteAprobacion('pendiente_aprobacion')).toBe(true)
    expect(esPendienteAprobacion('ACTIVO')).toBe(false)
    expect(mensajeConfirmarAprobacion('Café', false)).toContain('cuenta de cobro aprobada')
    expect(mensajeConfirmarAprobacion('Café', true)).not.toContain('cuenta de cobro')
    expect(cuentaAprobadaDe({ data: { data: { aprobada: true } } })).toBe(true)
  })
  it('Aprobar y Activar usan la aprobación de Moderación', () => {
    const src = readFileSync(new URL('./FichaTienda.tsx', import.meta.url), 'utf8')
    expect(src).toContain('Aprobar negocio')
    expect(src).toContain('aprobacionService.aprobarEmpresa(id)')
    expect(src).not.toContain("cambiarEstado('ACTIVO')")
  })
})
