import { useEffect, useRef } from 'react'

/** Variable CSS con el alto de la barra fija de abajo (CTA fija). El banner de cookies se apila encima. */
export const VAR_DOCK_ALTO = '--hc-dock-alto'

/**
 * Mientras el elemento esté montado, publica su alto en `--hc-dock-alto` para que lo flotante
 * (banner de cookies) no lo tape. Al desmontarse, la variable se quita.
 */
export function useDockInferior<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const raiz = document.documentElement
    const publicar = () => raiz.style.setProperty(VAR_DOCK_ALTO, `${Math.ceil(el.getBoundingClientRect().height)}px`)
    publicar()
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publicar)
    observador?.observe(el)
    return () => {
      observador?.disconnect()
      raiz.style.removeProperty(VAR_DOCK_ALTO)
    }
  }, [])
  return ref
}
