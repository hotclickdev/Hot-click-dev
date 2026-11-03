import { useEffect, useState } from 'react'

/** Recibe el elemento (callback ref en estado) para reengancharse si se monta después. true mientras el elemento se ve en pantalla. Sin IntersectionObserver (SSR/tests) devuelve false. */
export function useEnPantalla(el: Element | null): boolean {
  // Se guarda junto al elemento observado: si cambia el elemento, el valor viejo no aplica.
  const [estado, setEstado] = useState<{ el: Element | null; visible: boolean }>({ el: null, visible: false })
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setEstado({ el, visible: Boolean(e?.isIntersecting) }), { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [el])
  return el != null && estado.el === el && estado.visible
}
