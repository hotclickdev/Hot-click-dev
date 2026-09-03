/**
 * Callback para aplicar update del service worker tras confirmación del usuario.
 * Evita SKIP_WAITING + reload silencioso mid-wizard.
 */
let aplicarActualizacion: ((recargar?: boolean) => Promise<void>) | null = null

export function registrarAplicarSwUpdate(fn: (recargar?: boolean) => Promise<void>) {
  aplicarActualizacion = fn
}

export function aplicarSwUpdate(recargar = true): Promise<void> {
  return aplicarActualizacion?.(recargar) ?? Promise.resolve()
}
