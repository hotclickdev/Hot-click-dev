import { describe, expect, it } from 'vitest'
import { accionSegura, accionesSeguras, normalizeProduct } from './aiChatHelpers'

describe('asistente: vendedor del producto', () => {
  it('trae nombre del negocio y slug para /tienda/<slug>', () => {
    const p = normalizeProduct({ id: 1, nombre: 'Taza', empresaNombre: 'Café Sol', empresaSlug: 'cafe-sol' })
    expect(p.empresaNombre).toBe('Café Sol')
    expect(p.empresaSlug).toBe('cafe-sol')
  })

  it('sin negocio público no hay enlace', () => {
    expect(normalizeProduct({ id: 2, nombre: 'Vaso' }).empresaSlug).toBeNull()
  })
})

describe('asistente: botones del aviso de límite diario', () => {
  it('acepta buscar con ruta interna y whatsapp por wa.me', () => {
    expect(accionSegura({ tipo: 'buscar', label: 'Buscar productos', url: '/tienda/casa-luna' }))
      .toEqual({ tipo: 'buscar', label: 'Buscar productos', url: '/tienda/casa-luna' })
    expect(accionSegura({ tipo: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/50688881234' }))
      .toEqual({ tipo: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/50688881234' })
  })

  it('descarta URLs ajenas, protocolo relativo, javascript: y tipos desconocidos', () => {
    expect(accionSegura({ tipo: 'buscar', label: 'x', url: '//evil.test/a' })).toBeNull()
    expect(accionSegura({ tipo: 'buscar', label: 'x', url: 'https://evil.test' })).toBeNull()
    expect(accionSegura({ tipo: 'whatsapp', label: 'x', url: 'javascript:alert(1)' })).toBeNull()
    expect(accionSegura({ tipo: 'whatsapp', label: 'x', url: 'https://evil.test/50688881234' })).toBeNull()
    expect(accionSegura({ tipo: 'otro', label: 'x', url: '/ok' })).toBeNull()
    expect(accionSegura({ tipo: 'buscar', label: ' ', url: '/ok' })).toBeNull()
    expect(accionSegura(undefined)).toBeNull()
  })

  it('accionesSeguras filtra y conserva el orden', () => {
    const r = accionesSeguras([
      { tipo: 'buscar', label: 'Buscar productos', url: '/productos' },
      { tipo: 'whatsapp', label: 'WhatsApp', url: `${'http'}://wa.me/1` },
    ])
    expect(r.map(a => a.tipo)).toEqual(['buscar'])
  })
})
