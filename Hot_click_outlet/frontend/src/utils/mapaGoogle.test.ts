import { describe, expect, it } from 'vitest'
import { puntoDesdeEnlaceGoogle, urlGoogleMaps } from './mapaGoogle'

describe('puntoDesdeEnlaceGoogle', () => {
  it('lee el pin de los enlaces que comparte Google Maps', () => {
    expect(puntoDesdeEnlaceGoogle('https://www.google.com/maps/@9.928069,-84.090725,17z'))
      .toEqual({ latitud: 9.928069, longitud: -84.090725 })
    expect(puntoDesdeEnlaceGoogle('https://www.google.com/maps/search/?api=1&query=9.92,-84.09'))
      .toEqual({ latitud: 9.92, longitud: -84.09 })
    expect(puntoDesdeEnlaceGoogle('https://maps.google.com/?q=9.5,-84.1'))
      .toEqual({ latitud: 9.5, longitud: -84.1 })
  })

  it('no inventa un pin si el enlace no trae coordenadas', () => {
    expect(puntoDesdeEnlaceGoogle('https://www.google.com/maps/place/Escazu')).toBeNull()
    expect(puntoDesdeEnlaceGoogle('bodega central')).toBeNull()
  })

  it('arma el enlace para abrir el pin', () => {
    expect(urlGoogleMaps(9.9, -84.1)).toContain('query=9.9,-84.1')
  })
})
