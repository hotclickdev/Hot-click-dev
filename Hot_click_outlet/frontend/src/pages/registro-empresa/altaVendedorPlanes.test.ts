import { describe, expect, it } from 'vitest'
import { destinoTrasAlta, MONTO_PENDIENTE, PLANES_ALTA, planAlta } from './altaVendedorPlanes'

describe('altaVendedorPlanes', () => {
  it('ningún texto de plan trae montos ni porcentajes (los fija HOT_CLICK)', () => {
    const textos = PLANES_ALTA.flatMap((p) => [p.tagline, ...p.beneficios.map((b) => b.texto)]).join(' ')
    expect(textos).not.toMatch(/₡|%|\$|gratis|cupo|sucursal|prioritario|avanzad|básic/i)
    expect(MONTO_PENDIENTE).toBe('[PENDIENTE]')
  })

  it('solo Pyme y Negocio Plus prometen contacto visible', () => {
    const conContacto = PLANES_ALTA.filter((p) => p.beneficios.some((b) => b.texto === 'Tu contacto visible en tu tienda')).map((p) => p.id)
    expect(conContacto).toEqual(['pyme', 'negocio-plus'])
    expect(PLANES_ALTA.filter((p) => p.contactoVisible).map((p) => p.id)).toEqual(['pyme', 'negocio-plus'])
  })

  it('límites alineados con el backend: 50/500/ilimitado y 1/2/ilimitadas', () => {
    expect(planAlta('emprendedor').beneficios.map((b) => b.texto)).toContain('Hasta 50 productos')
    expect(planAlta('pyme').beneficios.map((b) => b.texto)).toContain('Hasta 500 productos')
    expect(planAlta('negocio-plus').beneficios.map((b) => b.texto)).toContain('Bodegas sin límite')
    expect(planAlta('emprendedor').beneficios.map((b) => b.texto)).toContain('Punto de venta con 1 caja')
  })

  it('Pyme y Plus siguen al paso de activar; Emprendedor no (BUG-03)', () => {
    expect(destinoTrasAlta('emprendedor')).toBeNull()
    expect(destinoTrasAlta('pyme')).toBe('/registro-empresa/activar-plan?plan=pyme')
    expect(destinoTrasAlta('negocio-plus')).toBe('/registro-empresa/activar-plan?plan=negocio-plus')
  })

  it('plan desconocido cae en Emprendedor', () => {
    expect(planAlta(null).id).toBe('emprendedor')
  })
})
