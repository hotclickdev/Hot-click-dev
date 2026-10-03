import type { Producto } from '@/types/producto'

/** Un negocio del directorio (Figma `29:1159`), armado con los productos públicos del catálogo. */
export type NegocioDirectorio = {
  slug: string
  nombre: string
  /** "Hogar y accesorios": las dos categorías con más productos del negocio. */
  rubro: string
  /** Categoría principal: alimenta los chips de filtro. */
  categoria: string
  /** La ciudad sale de la bodega del negocio (nota del Figma `29:1159`). */
  ciudad: string
  cantidad: number
  imagenes: string[]
}

const PROVINCIAS: Record<string, string> = {
  'SAN JOSE': 'San José', ALAJUELA: 'Alajuela', CARTAGO: 'Cartago', HEREDIA: 'Heredia',
  GUANACASTE: 'Guanacaste', PUNTARENAS: 'Puntarenas', LIMON: 'Limón',
}

export function nombreProvincia(valor: string | null | undefined): string {
  if (!valor) return ''
  const clave = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/_/g, ' ').trim()
  return PROVINCIAS[clave] ?? valor
}

type ProductoConBodega = Producto & { bodega?: { provincia?: string | null } | null }

function masFrecuentes(valores: string[], n: number): string[] {
  const conteo = new Map<string, number>()
  for (const v of valores) if (v) conteo.set(v, (conteo.get(v) ?? 0) + 1)
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v)
}

/** Agrupa los productos por negocio, en el orden en que aparece cada negocio. */
export function negociosDesdeProductos(productos: Producto[]): NegocioDirectorio[] {
  const grupos = new Map<string, ProductoConBodega[]>()
  for (const p of productos as ProductoConBodega[]) {
    const slug = p.empresaSlug
    if (!slug || !p.empresaNombre) continue
    const lista = grupos.get(slug) ?? []
    lista.push(p)
    grupos.set(slug, lista)
  }
  return [...grupos.entries()].map(([slug, lista]) => {
    const [primera = '', segunda] = masFrecuentes(lista.map((p) => p.categoriaNombre ?? ''), 2)
    const unir = /\sy\s/i.test(`${primera} ${segunda ?? ''}`) ? ', ' : ' y '
    const rubro = segunda ? `${primera}${unir}${segunda.charAt(0).toLowerCase()}${segunda.slice(1)}` : primera
    return {
      slug,
      nombre: lista[0].empresaNombre as string,
      rubro,
      categoria: primera,
      ciudad: nombreProvincia(masFrecuentes(lista.map((p) => p.bodega?.provincia ?? ''), 1)[0]),
      cantidad: lista.length,
      imagenes: lista.map((p) => p.imagenUrl).filter((u): u is string => Boolean(u)).slice(0, 3),
    }
  })
}

/** Chips de filtro: "Todos" más la categoría principal de cada negocio, sin repetir. */
export function categoriasDirectorio(negocios: NegocioDirectorio[]): string[] {
  return [...new Set(negocios.map((n) => n.categoria).filter(Boolean))]
}
