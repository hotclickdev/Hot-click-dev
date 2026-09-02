/**
 * Axios default Content-Type: application/json rompe FormData (el archivo llega vacío).
 * Hay que borrar el header para que el navegador ponga multipart con boundary.
 */
export function quitarContentTypeSiFormData(headers: unknown, data: unknown): void {
  if (typeof FormData === 'undefined' || !(data instanceof FormData)) return
  if (!headers || typeof headers !== 'object') return
  const h = headers as {
    setContentType?: (valor: false) => unknown
    delete?: (name: string) => unknown
  }
  if (typeof h.setContentType === 'function') {
    h.setContentType(false)
    return
  }
  if (typeof h.delete === 'function') {
    h.delete('Content-Type')
    return
  }
  delete (headers as Record<string, unknown>)['Content-Type']
}
