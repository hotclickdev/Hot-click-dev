import { describe, expect, it } from 'vitest'
import {
  idsSinUbicacion,
  listaSinUbicacionDesdeRespuesta,
  nombreEmpresaSinUbicacion,
  tituloAvisoSinUbicacion,
} from './empresasSinUbicacionHelpers'

describe('listaSinUbicacionDesdeRespuesta', () => {
  it('lee el ResponseDTO del backend', () => {
    const data = { success: true, data: [{ id: 7, nombreComercial: 'Bruma Café', visibilidadPublica: true }] }
    expect(listaSinUbicacionDesdeRespuesta(data)).toHaveLength(1)
  })

  it('acepta el arreglo plano y descarta formas inesperadas', () => {
    expect(listaSinUbicacionDesdeRespuesta([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(listaSinUbicacionDesdeRespuesta({ data: 'x' })).toEqual([])
    expect(listaSinUbicacionDesdeRespuesta(null)).toEqual([])
  })
})

describe('idsSinUbicacion', () => {
  it('normaliza los ids a string para cruzarlos con la lista de tiendas', () => {
    const ids = idsSinUbicacion([{ id: 7 }, { id: '9' }])
    expect(ids.has('7')).toBe(true)
    expect(ids.has('9')).toBe(true)
  })
})

describe('nombreEmpresaSinUbicacion', () => {
  it('usa el nombre comercial o cae al id', () => {
    expect(nombreEmpresaSinUbicacion({ id: 7, nombreComercial: 'Bruma Café' })).toBe('Bruma Café')
    expect(nombreEmpresaSinUbicacion({ id: 7, nombreComercial: '  ' })).toBe('Negocio #7')
  })
})

describe('tituloAvisoSinUbicacion', () => {
  it('singular y plural', () => {
    expect(tituloAvisoSinUbicacion(1)).toBe('1 negocio activo no tiene ubicación de despacho')
    expect(tituloAvisoSinUbicacion(3)).toBe('3 negocios activos no tienen ubicación de despacho')
  })
})
