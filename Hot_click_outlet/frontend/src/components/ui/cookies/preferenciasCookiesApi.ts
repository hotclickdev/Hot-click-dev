/** Evento global para abrir la hoja de preferencias de cookies (pie de página, Mi cuenta). */
export const EVENTO_ABRIR_PREFERENCIAS_COOKIES = 'hc:abrir-preferencias-cookies'

export function abrirPreferenciasCookies(): void {
  globalThis.dispatchEvent(new CustomEvent(EVENTO_ABRIR_PREFERENCIAS_COOKIES))
}
