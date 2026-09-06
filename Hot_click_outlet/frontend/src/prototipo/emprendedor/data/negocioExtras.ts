const CLAVE = 'hc-emp-negocio-extras-v1'

export type ExtrasNegocio = {
  categoria: string
  instagram: string
  zona: string
}

const VACIO: ExtrasNegocio = { categoria: '', instagram: '', zona: '' }

/** Lee cache local (solo fallback si GET /empresa/perfil falló). */
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

/** Borrador offline si el PUT a /empresa/perfil no llegó al servidor. */
export function guardarExtrasLocal(extras: ExtrasNegocio): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      categoria: extras.categoria ?? '',
      instagram: extras.instagram ?? '',
      zona: extras.zona ?? '',
    }))
  } catch (err) {
    console.warn('[negocioExtras] no se pudo cachear offline', err)
  }
}

/** Borra el cache tras un PUT exitoso. */
export function limpiarExtrasLocal(): void {
  localStorage.removeItem(CLAVE)
}
