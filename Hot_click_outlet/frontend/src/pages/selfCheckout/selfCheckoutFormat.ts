import { formatPrice } from '@/utils/format'

/** Monto en colones con punto de miles, como en Figma (`₡10.500`). */
export const fmt = (n: number | undefined) => formatPrice(n ?? 0)

/** `#Q-58` para un número de pedido (no duplica el `#` si ya viene). */
export const numeroConGato = (numero: string) => (numero.startsWith('#') ? numero : `#${numero}`)

/** Categorías distintas, en el orden en que aparecen en el menú. */
export function categoriasDelMenu(productos: { categoria?: string | null }[]): string[] {
  const vistas = new Set<string>()
  for (const p of productos) {
    const c = p.categoria?.trim()
    if (c) vistas.add(c)
  }
  return [...vistas]
}

/** Filtra el menú por categoría (`null` = todo) y por texto en el nombre. */
export function filtrarMenu<T extends { nombre?: string; categoria?: string | null }>(
  productos: T[],
  categoria: string | null,
  texto: string,
): T[] {
  const q = texto.trim().toLowerCase()
  return productos.filter((p) => {
    if (categoria && p.categoria?.trim() !== categoria) return false
    return !q || (p.nombre ?? '').toLowerCase().includes(q)
  })
}
