import { describe, expect, it } from 'vitest'
import { etiquetaRapida, mensajeTiendaRapida } from './tiendaRapida'

describe('tienda rápida', () => {
  it('el mensaje dice el plazo y que la persona completa sus datos', () => {
    const texto = mensajeTiendaRapida('Ana Solís', 'Taller Ana', 30, 'https://hotclick.lat/tienda-rapida/abc')
    expect(texto).toContain('Hola Ana')
    expect(texto).toContain('30 días')
    expect(texto).toContain('https://hotclick.lat/tienda-rapida/abc')
  })

  it('traduce el estado del enlace', () => {
    expect(etiquetaRapida('LISTA')).toBe('Datos listos')
    expect(etiquetaRapida('VENCIDA')).toBe('Venció')
    expect(etiquetaRapida('ESPERANDO')).toBe('Esperando datos')
  })
})
