const fmtColones = new Intl.NumberFormat('es-CR')

export function formatColones(monto: number | undefined | null): string {
  return fmtColones.format(Math.max(0, monto ?? 0))
}

export function nombreItem(item: { nombre?: string; nombreProducto?: string }): string {
  return item.nombre ?? item.nombreProducto ?? 'Producto'
}

export function inicialesProducto(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (palabras.length === 0) return '?'
  return palabras.map((palabra) => palabra.charAt(0).toUpperCase()).join('')
}

export function tituloYCodigo(nombre: string): { titulo: string; codigo: string | null } {
  const match = nombre.match(/^(.*)\s*\(([^)]+)\)\s*$/)
  if (!match) return { titulo: nombre, codigo: null }
  return { titulo: match[1].trim(), codigo: match[2].trim() }
}

/** Número SINPE sin el prefijo del país (`+506 7019-6686` -> `7019-6686`), como en Figma. */
export function sinpeNumeroVisible(numero: string | undefined | null): string {
  return (numero ?? '').replace(/^\+?\s*506[\s-]*/, '').trim()
}
