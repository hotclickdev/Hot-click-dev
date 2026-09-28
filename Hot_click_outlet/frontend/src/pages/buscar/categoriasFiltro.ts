import type { CategoriaConProductos } from '@/services/categoriaCatalogoService'

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Filtra categorías por nombre, sin distinguir acentos ni mayúsculas. */
export function filtrarCategorias(categorias: CategoriaConProductos[], texto: string): CategoriaConProductos[] {
  const q = normalizar(texto)
  if (!q) return categorias
  return categorias.filter((c) => normalizar(c.nombre).includes(q))
}
