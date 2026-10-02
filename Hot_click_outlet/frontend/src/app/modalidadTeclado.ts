/** Clase del `<html>` mientras se navega con Tab; un toque o clic la quita (P19). */
export const CLASE_TECLADO = 'hc-teclado'

/** En captura, para enterarse antes que cualquier `stopPropagation`. */
const CAPTURA: AddEventListenerOptions = { capture: true }

type TeclaFoco = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>

/** Solo Tab (con o sin Mayús) cuenta como navegación: escribir en un campo no enciende el anillo. */
export function esTeclaDeFoco(e: TeclaFoco): boolean {
  return e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey
}

/**
 * Marca la navegación por teclado en `raiz` para que `index.css` dibuje el anillo `--hc-focus-ring`
 * en campos que el diseño deja sin contorno. Devuelve la función que quita los oyentes.
 */
export function instalarModalidadTeclado(
  destino: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  raiz: { classList: Pick<DOMTokenList, 'add' | 'remove'> },
): () => void {
  const alTeclear = (e: Event) => {
    if (esTeclaDeFoco(e as KeyboardEvent)) raiz.classList.add(CLASE_TECLADO)
  }
  const alApuntar = () => raiz.classList.remove(CLASE_TECLADO)
  destino.addEventListener('keydown', alTeclear, CAPTURA)
  destino.addEventListener('pointerdown', alApuntar, CAPTURA)
  return () => {
    destino.removeEventListener('keydown', alTeclear, CAPTURA)
    destino.removeEventListener('pointerdown', alApuntar, CAPTURA)
  }
}
