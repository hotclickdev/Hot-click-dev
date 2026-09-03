const CLAVE = 'hc-emp-negocio-extras-v1'

export type ExtrasNegocio = {
  categoria: string
  instagram: string
  zona: string
}

const VACIO: ExtrasNegocio = { categoria: '', instagram: '', zona: '' }

/** Lee cache legacy sin borrarlo (fallback offline / error de red). */
export function leerExtrasLocal(): ExtrasNegocio {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return { ...VACIO }
    const parsed = JSON.parse(raw) as Partial<ExtrasNegocio>
    return {
      categoria: parsed.categoria ?? '',
      instagram: parsed.instagram ?? '',
      zona: parsed.zona ?? '',
    }
  } catch {
    return { ...VACIO }
  }
}

/** Borra el cache legacy tras migrar a API o guardar en servidor. */
export function limpiarExtrasLocal(): void {
  localStorage.removeItem(CLAVE)
}
