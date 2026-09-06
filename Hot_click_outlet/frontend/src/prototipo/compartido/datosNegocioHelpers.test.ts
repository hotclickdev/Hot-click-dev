import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  FORM_NEGOCIO_INICIAL,
  armarDescripcion,
  bodyPerfilDesdeForm,
  extrasDesdeApi,
  extrasDesdeForm,
  extrasOffline,
  formConExtrasOffline,
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

describe('extrasDesdeApi', () => {
  it('mapea categoriaNegocio, instagram y zonaEnvio del perfil', () => {
    expect(
      extrasDesdeApi({
        id: 1,
        categoriaNegocio: 'Ropa',
        instagram: '@tienda',
        zonaEnvio: 'GAM',
      }),
    ).toEqual({
      categoria: 'Ropa',
      instagram: '@tienda',
      zona: 'GAM',
    })
    expect(leerExtrasLocal).not.toHaveBeenCalled()
  })

  it('usa defaults si la API trae extras vacíos — no lee localStorage', () => {
    expect(extrasDesdeApi({ id: 1 })).toEqual({
      categoria: FORM_NEGOCIO_INICIAL.categoria,
      instagram: FORM_NEGOCIO_INICIAL.instagram,
      zona: FORM_NEGOCIO_INICIAL.zona,
    })
    expect(leerExtrasLocal).not.toHaveBeenCalled()
  })
})

describe('extrasOffline', () => {
  it('lee el cache local solo para fallback sin red', () => {
    expect(extrasOffline()).toEqual({
      categoria: 'LocalCat',
      instagram: '@local',
      zona: 'GAM',
    })
    expect(leerExtrasLocal).toHaveBeenCalledOnce()
  })
})

describe('formConExtrasOffline', () => {
  it('parte del formulario vacío y rellena extras desde cache local', () => {
    expect(formConExtrasOffline()).toMatchObject({
      nombre: '',
      categoria: 'LocalCat',
      instagram: '@local',
      zona: 'GAM',
    })
  })
})

describe('formDesdeEmpresa', () => {
  it('mapea perfil empresa a FormNegocio desde la API', () => {
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
    expect(leerExtrasLocal).not.toHaveBeenCalled()
  })

  it('no mezcla localStorage cuando el GET del perfil viene vacío en extras', () => {
    const form = formDesdeEmpresa({ id: 3, nombreComercial: 'Ana' })
    expect(form.nombre).toBe('Ana')
    expect(form.categoria).toBe(FORM_NEGOCIO_INICIAL.categoria)
    expect(form.instagram).toBe('')
    expect(form.zona).toBe('')
    expect(leerExtrasLocal).not.toHaveBeenCalled()
  })
})

describe('bodyPerfilDesdeForm', () => {
  it('arma el PUT /empresa/perfil con categoriaNegocio, instagram y zonaEnvio', () => {
    const form = {
      ...FORM_NEGOCIO_INICIAL,
      nombre: 'Café Ana',
      descripcion: 'Tostado local',
      categoria: 'Hogar',
      whatsapp: '50688887777',
      instagram: '@cafe.ana',
      zona: 'Pérez Zeledón',
    }
    expect(bodyPerfilDesdeForm(form, 'raw viejo')).toEqual({
      nombreComercial: 'Café Ana',
      descripcion: 'Tostado local',
      numeroWhatsapp: '50688887777',
      categoriaNegocio: 'Hogar',
      instagram: '@cafe.ana',
      zonaEnvio: 'Pérez Zeledón',
    })
  })
})

describe('extrasDesdeForm', () => {
  it('extrae categoria, instagram y zona para cache offline', () => {
    expect(
      extrasDesdeForm({
        ...FORM_NEGOCIO_INICIAL,
        categoria: 'Ropa',
        instagram: '@x',
        zona: 'GAM',
      }),
    ).toEqual({ categoria: 'Ropa', instagram: '@x', zona: 'GAM' })
  })
})
