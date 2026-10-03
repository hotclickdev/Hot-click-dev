import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import { categoriasDirectorio, negociosDesdeProductos, nombreProvincia } from './directorioHelpers'

const prod = (id: number, empresa: string, slug: string, cat: string, provincia = 'SAN JOSE') =>
  ({ id, empresaNombre: empresa, empresaSlug: slug, categoriaNombre: cat, imagenUrl: `https://img/${id}.jpg`, bodega: { provincia } }) as unknown as Producto

describe('directorio de emprendimientos (Figma 29:1159)', () => {
  const lista = [
    prod(1, 'Casa Luna 506', 'casa-luna-506', 'Hogar'), prod(2, 'Casa Luna 506', 'casa-luna-506', 'Hogar'),
    prod(3, 'Casa Luna 506', 'casa-luna-506', 'Accesorios'), prod(4, 'Casa Luna 506', 'casa-luna-506', 'Hogar'),
    prod(5, 'Bruma Café', 'bruma-cafe', 'Café', 'HEREDIA'),
  ]
  it('agrupa por negocio con rubro, ciudad, conteo y 3 imágenes', () => {
    const [cl, bc] = negociosDesdeProductos(lista)
    expect(cl).toMatchObject({ slug: 'casa-luna-506', rubro: 'Hogar y accesorios', ciudad: 'San José', cantidad: 4 })
    expect(cl.imagenes).toHaveLength(3)
    expect(bc).toMatchObject({ nombre: 'Bruma Café', rubro: 'Café', ciudad: 'Heredia', cantidad: 1 })
  })
  it('ignora productos sin negocio y arma los chips sin repetir', () => {
    const negocios = negociosDesdeProductos([...lista, { id: 9 } as unknown as Producto])
    expect(negocios).toHaveLength(2)
    expect(categoriasDirectorio(negocios)).toEqual(['Hogar', 'Café'])
  })
  it('nombra las provincias con tilde', () => {
    expect(nombreProvincia('LIMON')).toBe('Limón')
    expect(nombreProvincia('')).toBe('')
  })
})
