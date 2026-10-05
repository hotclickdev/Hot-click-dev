import { describe, expect, it } from 'vitest'
import { destinoAlVolver, esRutaPrincipal, migasDeRuta, type EtiquetasMigas } from './migasRuta'

const etiquetas = new Proxy({} as EtiquetasMigas, {
  get: (_objetivo, clave) => String(clave),
})

describe('esRutaPrincipal', () => {
  it('oculta el cromo en el inicio y en las landings con el encabezado principal', () => {
    expect(esRutaPrincipal('/')).toBe(true)
    expect(esRutaPrincipal('/emprende')).toBe(true)
    expect(esRutaPrincipal('/para-pymes')).toBe(true)
    expect(esRutaPrincipal('/planes')).toBe(true)
    expect(esRutaPrincipal('/comprar/tecnologia')).toBe(true)
    expect(esRutaPrincipal('/tiendas/san-jose')).toBe(true)
  })

  it('muestra el cromo al entrar a una pantalla', () => {
    expect(esRutaPrincipal('/productos')).toBe(false)
    expect(esRutaPrincipal('/tienda/luna')).toBe(false)
    expect(esRutaPrincipal('/carrito')).toBe(false)
  })
})

describe('migasDeRuta', () => {
  it('arma la ficha con categoría y el nombre publicado por la pantalla', () => {
    expect(migasDeRuta('/productos/9', '', etiquetas, {
      actual: 'Taza',
      categoriaNombre: 'Cocina',
      categoriaId: 4,
    })).toEqual([
      { etiqueta: 'inicio', to: '/' },
      { etiqueta: 'catalogo', to: '/productos' },
      { etiqueta: 'Cocina', to: '/productos?cat=4' },
      { etiqueta: 'Taza' },
    ])
  })

  it('arma el perfil del negocio y sus subpantallas', () => {
    expect(migasDeRuta('/tienda/luna', '', etiquetas, { nombreTienda: 'Luna' })).toEqual([
      { etiqueta: 'inicio', to: '/' },
      { etiqueta: 'tiendas', to: '/emprendimientos' },
      { etiqueta: 'Luna' },
    ])
    expect(migasDeRuta('/tienda/luna/carrito', '', etiquetas, { nombreTienda: 'Luna' })).toEqual([
      { etiqueta: 'inicio', to: '/' },
      { etiqueta: 'Luna', to: '/tienda/luna' },
      { etiqueta: 'carrito' },
    ])
  })

  it('agrega la pestaña de la cuenta', () => {
    expect(migasDeRuta('/perfil', '?vista=opiniones', etiquetas)).toEqual([
      { etiqueta: 'inicio', to: '/' },
      { etiqueta: 'cuenta', to: '/perfil' },
      { etiqueta: 'opiniones' },
    ])
  })

  it('usa la búsqueda como última miga del catálogo', () => {
    expect(migasDeRuta('/productos', '?search=taza', etiquetas).map((m) => m.etiqueta)).toEqual(['inicio', 'catalogo', 'taza'])
    expect(migasDeRuta('/productos', '?search=taza', etiquetas)[1]).toEqual({ etiqueta: 'catalogo', to: '/productos' })
  })

  it('el listado general enlaza Catálogo con la pantalla de categorías', () => {
    const migas = migasDeRuta('/productos', '', etiquetas)
    expect(migas).toEqual([
      { etiqueta: 'inicio', to: '/' },
      { etiqueta: 'catalogo', to: '/categorias' },
    ])
    expect(destinoAlVolver(migas)).toBe('/categorias')
  })
})

describe('destinoAlVolver', () => {
  it('cae en el padre cuando la pantalla se abrió directo', () => {
    const migas = migasDeRuta('/mis-pedidos/12', '', etiquetas)
    expect(destinoAlVolver(migas)).toBe('/mis-pedidos')
  })
})
