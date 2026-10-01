/**
 * Evento global para abrir la hoja "Idioma y accesibilidad" desde otros módulos
 * (pie de página, Mi cuenta: Figma `51:2590`, nota E).
 */
export const EVENTO_ABRIR_ACCESIBILIDAD = 'hc:abrir-accesibilidad'

export function abrirAccesibilidad(): void {
  globalThis.dispatchEvent(new CustomEvent(EVENTO_ABRIR_ACCESIBILIDAD))
}
