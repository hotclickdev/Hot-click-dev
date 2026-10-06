export type BodegaMarcable = {
  id: string
  nombre: string
  direccion: string
  telefono: string
  encargado: string
  latitud: number | null
  longitud: number | null
}

function numero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim()) {
    const n = Number(valor)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function filas(data: unknown): Record<string, unknown>[] {
  const raw = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  if (!Array.isArray(raw)) return []
  return raw.filter((fila) => fila && typeof fila === 'object') as Record<string, unknown>[]
}

/** Bodegas del vendedor que se pueden marcar como punto de recolección. */
export function bodegasMarcables(data: unknown): BodegaMarcable[] {
  return filas(data).flatMap((fila) => {
    const id = numero(fila.id)
    if (id == null || id <= 0) return []
    return [{
      id: String(id),
      nombre: texto(fila.nombreBodega) || 'Bodega',
      direccion: texto(fila.direccionExacta),
      telefono: texto(fila.telefono),
      encargado: texto(fila.encargadoNombre),
      latitud: numero(fila.latitud),
      longitud: numero(fila.longitud),
    }]
  })
}

export function direccionDeBodega(bodega: BodegaMarcable): string {
  return [bodega.nombre, bodega.direccion].filter(Boolean).join(' — ')
}
