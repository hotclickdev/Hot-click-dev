import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  FORM_NEGOCIO_INICIAL,
  armarDescripcion,
  extrasDesdeApiOLocal,
  formDesdeEmpresa,
} from './datosNegocioHelpers'

vi.mock('@/prototipo/emprendedor/data/negocioExtras', () => ({
  leerExtrasLocal: vi.fn(() => ({
    categoria: 'LocalCat',
    instagram: '@local',
    zona: 'GAM',
  })),
}))

import { leerExtrasLocal } from '@/prototipo/emprendedor/data/negocioExtras'

beforeEach(() => {
  vi.mocked(leerExtrasLocal).mockClear()
})

describe('armarDescripcion', () => {
  it('devuelve texto limpio si no hay fotos embebidas', () => {
    expect(armarDescripcion('Tienda de gadgets', 'Tienda vieja')).toBe('Tienda de gadgets')
  })

  it('preserva el bloque [FOTOS] del raw anterior', () => {
    const raw = 'Antes\n[FOTOS]["a.jpg"][/FOTOS]'
    expect(armarDescripcion('Nueva desc', raw)).toBe('Nueva desc\n[FOTOS]["a.jpg"][/FOTOS]')
  })
})

describe('extrasDesdeApiOLocal', () => {
  it('usa API cuando hay algún campo de extras', () => {
    expect(
      extrasDesdeApiOLocal({
        id: 1,
        categoriaNegocio: 'Ropa',
        instagram: '',
        zonaEnvio: '',
      }),
    ).toEqual({
      categoria: 'Ropa',
      instagram: FORM_NEGOCIO_INICIAL.instagram,
      zona: FORM_NEGOCIO_INICIAL.zona,
    })
    expect(leerExtrasLocal).not.toHaveBeenCalled()
  })

  it('cae a localStorage si la API no trae extras', () => {
    expect(extrasDesdeApiOLocal({ id: 1 })).toEqual({
      categoria: 'LocalCat',
      instagram: '@local',
      zona: 'GAM',
    })
  })
})

describe('formDesdeEmpresa', () => {
  it('mapea perfil empresa a FormNegocio', () => {
    const form = formDesdeEmpresa({
      id: 9,
      nombreComercial: 'Hot Shop',
      descripcion: 'Vendemos tech',
      numeroWhatsapp: '88880000',
      categoriaNegocio: 'Tecnología',
      instagram: '@hot',
      zonaEnvio: 'SJ',
    })
    expect(form).toMatchObject({
      nombre: 'Hot Shop',
      descripcion: 'Vendemos tech',
      categoria: 'Tecnología',
      whatsapp: '88880000',
      instagram: '@hot',
      zona: 'SJ',
    })
  })
})
