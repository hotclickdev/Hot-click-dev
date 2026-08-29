const CLAVE = 'hc-emp-negocio-extras-v1'

export type ExtrasNegocio = {
  categoria: string
  instagram: string
  zona: string
}

const VACIO: ExtrasNegocio = { categoria: '', instagram: '', zona: '' }

/** Campos de negocio sin columna API aún (categoría / IG / zona). */
export function leerExtrasNegocio(): ExtrasNegocio {
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

export function guardarExtrasNegocio(extras: ExtrasNegocio): void {
  localStorage.setItem(CLAVE, JSON.stringify(extras))
}
