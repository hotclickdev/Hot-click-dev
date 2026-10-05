import { describe, expect, it } from 'vitest'
import { descripcionSolicitudFoto, PREFIJO_SOLICITUD_FOTO, urlDeFotoSubida } from './solicitudDesdeFoto'

describe('descripcionSolicitudFoto', () => {
  it('distingue catálogo vacío de parecidos que no servían', () => {
    expect(descripcionSolicitudFoto(['Reloj'], false)).toBe(
      `${PREFIJO_SOLICITUD_FOTO} No había un producto parecido en el catálogo. Detectamos: Reloj.`,
    )
    expect(descripcionSolicitudFoto(['Taza'], true)).toContain('Las opciones parecidas no eran el producto.')
  })

  it('omite el detectado si no hay etiquetas', () => {
    expect(descripcionSolicitudFoto(['  '], false)).not.toContain('Detectamos')
  })
})

describe('telefonoSolicitudFoto', () => {
  it('normaliza el número local y rechaza uno corto', async () => {
    const { telefonoSolicitudFoto } = await import('./solicitudDesdeFoto')
    expect(telefonoSolicitudFoto('8888 8888')).toBe('+50688888888')
    expect(telefonoSolicitudFoto('123')).toBeNull()
  })
})
describe('urlDeFotoSubida', () => {
  it('lee la url del sobre ya abierto o la url directa', () => {
    expect(urlDeFotoSubida({ url: 'https://cdn.example/foto.jpg' })).toBe('https://cdn.example/foto.jpg')
    expect(urlDeFotoSubida('https://cdn.example/foto.jpg')).toBe('https://cdn.example/foto.jpg')
    expect(urlDeFotoSubida({ url: '' })).toBeNull()
    expect(urlDeFotoSubida(null)).toBeNull()
  })
})
