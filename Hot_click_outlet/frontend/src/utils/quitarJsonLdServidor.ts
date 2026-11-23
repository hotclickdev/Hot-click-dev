import { useEffect } from 'react'

/**
 * El servidor ya mete el JSON-LD de la ficha/tienda en el HTML inicial (marcado con data-hc-ssr).
 * Cuando el cliente monta su propio JSON-LD, se quita el del servidor para no duplicar Product/OnlineStore.
 */
export function useQuitarJsonLdServidor(activo = true): void {
  useEffect(() => {
    if (!activo) return
    document.querySelectorAll('script[type="application/ld+json"][data-hc-ssr]').forEach((el) => el.remove())
  }, [activo])
}
