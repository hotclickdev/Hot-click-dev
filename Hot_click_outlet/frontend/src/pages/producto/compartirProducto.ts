export type ResultadoCompartir = 'compartido' | 'copiado' | 'cancelado' | 'error'

/** Comparte la ficha con el menú nativo; si no existe, copia el enlace al portapapeles. */
export async function compartirProducto(titulo: string): Promise<ResultadoCompartir> {
  const url = window.location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: titulo, url })
      return 'compartido'
    }
  } catch {
    // el usuario canceló el menú nativo
    return 'cancelado'
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copiado'
  } catch {
    // sin acceso al portapapeles: no hay otra vía
    return 'error'
  }
}
