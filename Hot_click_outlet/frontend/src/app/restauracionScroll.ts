/**
 * Posición vertical de cada entrada del historial (clave `location.key` de React Router), solo en memoria:
 * sirve para que «Atrás» y «Adelante» dentro de la SPA vuelvan a donde estaba el comprador.
 */
const posiciones = new Map<string, number>()

/** Entradas recordadas; las más viejas se descartan. */
export const MAX_POSICIONES = 50

/** Tiempo que se reintenta mientras la página de destino todavía carga sus datos. */
export const MAX_MS_RESTAURAR = 3000

export function guardarPosicion(clave: string, y: number): void {
  posiciones.delete(clave)
  posiciones.set(clave, Math.max(0, Math.round(y)))
  if (posiciones.size <= MAX_POSICIONES) return
  const masVieja = posiciones.keys().next().value
  if (masVieja !== undefined) posiciones.delete(masVieja)
}

export function posicionGuardada(clave: string): number | undefined {
  return posiciones.get(clave)
}

/** Solo para tests. */
export function olvidarPosiciones(): void {
  posiciones.clear()
}

/** Atrás/adelante (`POP` de `useNavigationType`) recupera la posición guardada; un enlace nuevo o un reemplazo empieza arriba. */
export function destinoScroll(tipo: string, guardada: number | undefined): number {
  return tipo === 'POP' && guardada !== undefined ? guardada : 0
}

/**
 * Un reemplazo que deja la misma URL (el catálogo normaliza su query al montar) no es otra página: no mueve el
 * scroll ni corta una restauración en curso.
 */
export function cambiaDePagina(tipo: string, url: string, urlAnterior: string | null): boolean {
  return tipo !== 'REPLACE' || url !== urlAnterior
}

/** Hay que seguir intentando mientras no se llegó (la página aún no es tan alta) y queda tiempo. */
export function debeReintentar(destino: number, actual: number, transcurridoMs: number): boolean {
  return Math.abs(actual - destino) > 1 && transcurridoMs < MAX_MS_RESTAURAR
}

const EVENTOS_DEL_USUARIO = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const

/**
 * Lleva la ventana a `y`. Si la página todavía no es tan alta (datos asíncronos), reintenta cuadro a
 * cuadro hasta llegar o agotar `MAX_MS_RESTAURAR`; si el comprador scrollea o toca, se detiene.
 * Devuelve la función que cancela.
 */
export function irAPosicion(y: number): () => void {
  globalThis.scrollTo(0, y)
  if (y === 0) return () => undefined
  const inicio = performance.now()
  let id = 0
  const paso = () => {
    globalThis.scrollTo(0, y)
    if (debeReintentar(y, globalThis.scrollY, performance.now() - inicio)) id = globalThis.requestAnimationFrame(paso)
  }
  const cancelar = () => {
    globalThis.cancelAnimationFrame(id)
    EVENTOS_DEL_USUARIO.forEach((evento) => globalThis.removeEventListener(evento, cancelar))
  }
  EVENTOS_DEL_USUARIO.forEach((evento) => globalThis.addEventListener(evento, cancelar, { passive: true }))
  id = globalThis.requestAnimationFrame(paso)
  return cancelar
}
