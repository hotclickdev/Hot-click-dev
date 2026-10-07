export const ACCIONES_NOTA = [
  { id: 'porContactar', label: 'Por contactar', accion: 'Esperar respuesta' },
  { id: 'esperandoStock', label: 'Esperando stock', accion: 'Conseguir stock' },
  { id: 'enEntrega', label: 'En entrega', accion: 'Seguir la entrega' },
  { id: 'reclamo', label: 'Reclamo', accion: 'Resolver el reclamo' },
] as const

export type AccionNota = (typeof ACCIONES_NOTA)[number]

export function accionNota(id: string): AccionNota | null {
  return ACCIONES_NOTA.find((fila) => fila.id === id) ?? null
}

/** La bandeja es el botón. El detalle solo entra si lo escribieron. */
export function notaDe(id: string, detalle: string): { nota: string; proximaAccion: string; bandeja: string } | null {
  const accion = accionNota(id)
  if (!accion) return null
  const extra = detalle.trim()
  return {
    bandeja: accion.id,
    proximaAccion: accion.accion,
    nota: extra.length >= 3 ? extra : accion.accion,
  }
}
